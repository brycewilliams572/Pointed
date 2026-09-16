const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { connection, load } = require('./sqlite-helper.cjs');
const { migrateDatabase } = load('src/services/database/migrations');
const { GameRepository } = load('src/services/database/game-repository');
const { getHistoryPoint, groupHistory } = load('src/services/history');
const draft = { name: 'Friday', players: [{ name: 'Alex', color: '#112233' }, { name: 'Sam', color: '#AABBCC' }] };
const scores = (state) => state.game.players.map((player) => player.score);
async function setup(db = connection()) {
  await migrateDatabase(db);
  const repo = new GameRepository(db);
  const state = await repo.createGame(draft);
  return { db, repo, id: state.game.id, a: state.game.players[0].id, b: state.game.players[1].id };
}

test('v1 migration preserves game, IDs, scores and historical Undo; upgrade rollback is safe', async () => {
  const db = connection();
  try {
    await db.execAsync(fs.readFileSync(path.join(__dirname, 'fixtures/schema-v1.sql'), 'utf8'));
    await db.execAsync(`
      INSERT INTO games (id, name, created_at, updated_at) VALUES ('g', 'Existing', 1, 3);
      INSERT INTO players (id, game_id, name, color, score, display_order) VALUES ('p', 'g', 'Alex', '#112233', 5, 0);
      INSERT INTO score_events (id, game_id, player_id, type, amount, requested_amount, previous_score, new_score, created_at, undone_at, undo_of) VALUES
        (1, 'g', 'p', 'ADD_SCORE', 5, 5, 0, 5, 1, NULL, NULL),
        (2, 'g', 'p', 'SET_SCORE', 15, 20, 5, 20, 2, 3, NULL),
        (3, 'g', 'p', 'UNDO', -15, -15, 20, 5, 3, NULL, 2);
    `);
    const original = db.execAsync;
    db.execAsync = async (sql) => { await original(sql); if (sql.includes('CREATE TABLE score_actions')) throw new Error('Interrupted upgrade'); };
    await assert.rejects(migrateDatabase(db));
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 1);
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM score_events')).n, 3);
    db.execAsync = original;
    await migrateDatabase(db);
    await migrateDatabase(db);
    const repo = new GameRepository(db);
    let state = await repo.loadGame('g');
    assert.deepEqual(scores(state), [5]);
    assert.deepEqual(state.events.map((event) => event.id), [3, 2, 1]);
    assert.equal(state.events[0].undoOf, 2);
    assert.equal(state.events[1].actionState, 'abandoned');
    assert.equal(state.canRedo, false);
    state = await repo.undo('g');
    assert.deepEqual(scores(state), [0]);
    state = await repo.redo('g');
    assert.deepEqual(scores(state), [5]);
    state = await repo.restoreHistory('g', 2);
    assert.deepEqual(scores(state), [20]);
    assert.deepEqual(await db.getAllAsync('PRAGMA foreign_key_check'), []);
  } finally { db.native.close(); }
});

test('repeated Undo/Redo uses stored values for presets, custom, Set and clamped subtraction; new action branches', async () => {
  const { db, repo, id, a } = await setup();
  try {
    await repo.changeScore(id, a, 20, 'set', false);
    await repo.changeScore(id, a, 8, 'manual', false);
    assert.deepEqual(scores(await repo.undo(id)), [20, 0]);
    assert.deepEqual(scores(await repo.redo(id)), [28, 0]);
    assert.deepEqual(scores(await repo.undo(id)), [20, 0]);
    assert.deepEqual(scores(await repo.redo(id)), [28, 0]);
    await repo.undo(id);
    let state = await repo.changeScore(id, a, 5, 'manual', false);
    assert.deepEqual(scores(state), [25, 0]);
    assert.equal(state.canRedo, false);
    assert.deepEqual(await repo.redo(id), state);
    assert.ok(state.events.some((event) => event.actionState === 'abandoned'));
    await repo.changeScore(id, a, 1, 'preset', false);
    await repo.undo(id);
    assert.deepEqual(scores(await repo.redo(id)), [26, 0]);
    await repo.changeScore(id, a, -100, 'manual', false);
    assert.deepEqual(scores(await repo.undo(id)), [26, 0]);
    assert.deepEqual(scores(await repo.redo(id)), [0, 0]);
    await repo.undo(id);
    await repo.undo(id);
    assert.deepEqual(scores(await repo.redo(id)), [26, 0]);
    assert.deepEqual(scores(await repo.redo(id)), [0, 0]);
    await repo.changeScore(id, a, -50, 'set', true);
    await repo.undo(id);
    assert.deepEqual(scores(await repo.redo(id)), [-50, 0]);
    state = await repo.loadGame(id);
    await assert.rejects(repo.changeScore(id, a, 5, 'manual', false, 20), /score changed/);
    assert.deepEqual(await repo.loadGame(id), state);
  } finally { db.native.close(); }
});

test('restore across players is one reversible batch; audit states, branch and redo survive disk reopen', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pointed-history-'));
  const filename = path.join(dir, 'game.db');
  let db = connection(filename);
  try {
    let { repo, id, a, b } = await setup(db);
    const turn1 = await repo.changeScore(id, a, 5, 'manual', false);
    const target = turn1.events[0].id;
    await repo.changeScore(id, b, 10, 'manual', false);
    await repo.changeScore(id, a, 10, 'manual', false);
    let state = await repo.restoreHistory(id, target);
    assert.deepEqual(scores(state), [5, 0]);
    assert.equal(groupHistory(state.events)[0].length, 2);
    const restoreIds = groupHistory(state.events)[0].map((event) => event.id);
    assert.deepEqual([...getHistoryPoint(state, restoreIds[1]).scores.values()], [5, 0]);
    assert.deepEqual(scores(await repo.undo(id)), [15, 10]);
    db.native.close();
    db = connection(filename);
    await migrateDatabase(db);
    repo = new GameRepository(db);
    state = await repo.loadGame(id);
    assert.equal(state.canRedo, true);
    state = await repo.redo(id);
    assert.deepEqual(scores(state), [5, 0]);
    const afterRedo = state.events[0].id;
    await repo.changeScore(id, b, 30, 'set', false);
    state = await repo.restoreHistory(id, afterRedo);
    assert.deepEqual(scores(state), [5, 0]);
    await repo.undo(id);
    assert.deepEqual(scores(await repo.loadGame(id)), [5, 30]);
    // Restoring a different historical state creates a new branch and clears Redo.
    state = await repo.restoreHistory(id, target);
    assert.equal(state.canRedo, false);
    assert.deepEqual(scores(state), [5, 0]);
    db.native.close();
    db = connection(filename);
    await migrateDatabase(db);
    assert.deepEqual(scores(await new GameRepository(db).loadGame(id)), [5, 0]);
    assert.deepEqual(await db.getAllAsync('PRAGMA foreign_key_check'), []);
  } finally { db.native.close(); fs.rmSync(dir, { recursive: true }); }
});

test('failed multi-player restore/redo rolls back every score, event and action state', async () => {
  const { db, repo, id, a, b } = await setup();
  try {
    const first = await repo.changeScore(id, a, 5, 'manual', false);
    await repo.changeScore(id, a, 10, 'manual', false);
    let before = await repo.changeScore(id, b, 10, 'manual', false);
    // Failure occurs after the first player's row and event have already changed.
    await db.runAsync('CREATE TABLE fail_player (id TEXT)');
    await db.runAsync('INSERT INTO fail_player VALUES (?)', b);
    await db.execAsync("CREATE TRIGGER fail_restore BEFORE INSERT ON score_events WHEN NEW.type = 'RESTORE' AND NEW.player_id IN (SELECT id FROM fail_player) BEGIN SELECT RAISE(ABORT, 'restore failure'); END;");
    await assert.rejects(repo.restoreHistory(id, first.events[0].id));
    assert.deepEqual(await repo.loadGame(id), before);
    await db.execAsync('DROP TRIGGER fail_restore');
    await repo.restoreHistory(id, first.events[0].id);
    before = await repo.undo(id);
    await db.execAsync("CREATE TRIGGER fail_redo BEFORE INSERT ON score_events WHEN NEW.type = 'REDO' BEGIN SELECT RAISE(ABORT, 'redo failure'); END;");
    await assert.rejects(repo.redo(id));
    assert.deepEqual(await repo.loadGame(id), before);
    await db.execAsync('DROP TRIGGER fail_redo');
    assert.deepEqual(scores(await repo.redo(id)), [5, 0]);
  } finally { db.native.close(); }
});

test('deletion rolls back on failure and removes all related rows without affecting another game', async () => {
  const { db, repo, id, a } = await setup();
  try {
    await repo.changeScore(id, a, 5, 'manual', false);
    await repo.undo(id);
    await repo.redo(id);
    const before = await repo.loadGame(id);
    const other = await repo.createGame(draft);
    await db.execAsync("CREATE TRIGGER fail_delete BEFORE DELETE ON games BEGIN SELECT RAISE(ABORT, 'delete failure'); END;");
    await assert.rejects(repo.deleteGame(id));
    assert.deepEqual(await repo.loadGame(id), before);
    await db.execAsync('DROP TRIGGER fail_delete');
    await repo.deleteGame(id);
    await assert.rejects(repo.loadGame(id), /could not be found/);
    for (const table of ['players', 'score_events', 'score_actions']) {
      assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM ' + table + ' WHERE game_id = ?', id)).n, 0);
    }
    assert.deepEqual(await repo.loadGame(other.game.id), other);
    assert.equal((await repo.listGames()).length, 1);
    assert.deepEqual(await db.getAllAsync('PRAGMA foreign_key_check'), []);
  } finally { db.native.close(); }
});
