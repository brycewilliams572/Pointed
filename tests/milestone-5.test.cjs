const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { connection, load } = require('./sqlite-helper.cjs');
const { migrateDatabase } = load('src/services/database/migrations');
const { GameRepository } = load('src/services/database/game-repository');
const draft = { name: "Game'); DROP TABLE games; --", players: [
  { name: "O'Brien", color: '#123456' }, { name: 'Second', color: '#abcdef' },
] };

test('concurrent initialization shares one promise and a failed migration can retry', async () => {
  let opens = 0, closes = 0;
  const connections = [];
  const { getGameRepository } = load('src/services/database/database', {
    'expo-sqlite': { async openDatabaseAsync() {
      opens++;
      const db = connection();
      connections.push(db);
      db.closeAsync = async () => { closes++; db.native.close(); };
      if (opens === 1) db.execAsync = async () => { throw new Error('Initialization failed'); };
      return db;
    } },
  });
  const first = getGameRepository();
  assert.equal(getGameRepository(), first);
  await assert.rejects(first);
  assert.equal(closes, 1);
  const [a, b] = await Promise.all([getGameRepository(), getGameRepository()]);
  assert.equal(a, b);
  assert.equal(opens, 2);
  assert.deepEqual(await a.listGames(), []);
  connections[1].native.close();
});

test('migration, creation, rapid scoring, history, stored-score Undo and disk resume', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pointed-test-'));
  const filename = path.join(dir, 'pointed.db');
  let db = connection(filename);
  try {
    await migrateDatabase(db);
    await migrateDatabase(db);
    let repo = new GameRepository(db);
    let state = await repo.createGame(draft);
    const id = state.game.id;
    const player = state.game.players[0].id;
    await Promise.all(Array.from({ length: 100 }, () => repo.changeScore(id, player, 1, 'preset', false)));
    state = await repo.loadGame(id);
    assert.equal(state.game.players[0].score, 100);
    assert.equal(state.game.players[1].score, 0);
    assert.equal(state.events.length, 100);
    assert.equal(state.events[0].previousScore, 99);
    await repo.changeScore(id, player, 5, 'set', false);
    state = await repo.changeScore(id, player, -10, 'manual', false);
    assert.equal(state.game.players[0].score, 0);
    assert.equal(state.events[0].amount, -5);
    assert.equal(state.events[0].requestedAmount, -10);
    state = await repo.undo(id);
    assert.equal(state.game.players[0].score, 5);
    assert.equal(state.events[0].type, 'UNDO');
    assert.equal(state.events[0].undoOf, state.events[1].id);
    assert.ok(state.events[1].undoneAt);
    state = await repo.undo(id);
    assert.equal(state.game.players[0].score, 100);
    await repo.setLayout(id, 'list');
    db.native.close();
    db = connection(filename);
    await migrateDatabase(db);
    repo = new GameRepository(db);
    state = await repo.loadGame(id);
    assert.equal(state.game.name, draft.name);
    assert.equal(state.game.players[0].name, "O'Brien");
    assert.equal(state.game.players[0].score, 100);
    assert.equal(state.game.layout, 'list');
    assert.equal(state.events.length, 104);
    assert.equal((await repo.listGames())[0].playerCount, 2);
    await repo.undo(id);
    assert.equal((await repo.loadGame(id)).game.players[0].score, 99);
    assert.deepEqual(await db.getAllAsync('PRAGMA foreign_key_check'), []);
  } finally { db.native.close(); fs.rmSync(dir, { recursive: true }); }
});

test('failed event insert rolls back score, Undo marker and timestamps; queue recovers', async () => {
  const db = connection();
  try {
    await migrateDatabase(db);
    const repo = new GameRepository(db);
    let state = await repo.createGame(draft);
    const id = state.game.id, player = state.game.players[0].id;
    state = await repo.changeScore(id, player, 5, 'preset', false);
    await db.execAsync("CREATE TRIGGER fail_event BEFORE INSERT ON score_events BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    await assert.rejects(repo.changeScore(id, player, 10, 'preset', false));
    assert.deepEqual(await repo.loadGame(id), state);
    await assert.rejects(repo.undo(id));
    assert.deepEqual(await repo.loadGame(id), state);
    await db.execAsync('DROP TRIGGER fail_event');
    await assert.rejects(repo.changeScore(id, player, -10, 'set', false));
    await assert.rejects(repo.changeScore(id, player, 1.5, 'manual', false));
    await assert.rejects(repo.changeScore(id, 'missing', 1, 'preset', false));
    assert.deepEqual(await repo.changeScore(id, player, 0, 'manual', false), state);
    await repo.undo(id);
    assert.equal((await repo.loadGame(id)).game.players[0].score, 0);
    await assert.rejects(repo.createGame({ players: [...draft.players, { name: 'Invalid', color: 'bad color' }] }));
    assert.equal((await repo.listGames()).length, 1);
  } finally { db.native.close(); }
});

test('failed migration is atomic and newer databases are refused', async () => {
  const db = connection();
  try {
    const original = db.execAsync;
    db.execAsync = async (sql) => {
      await original(sql);
      if (sql.includes('CREATE TABLE games')) throw new Error('Interrupted migration');
    };
    await assert.rejects(migrateDatabase(db));
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 0);
    assert.equal(await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'games'"), null);
    db.execAsync = original;
    await migrateDatabase(db);
    await db.execAsync('PRAGMA user_version = 3');
    await assert.rejects(migrateDatabase(db), /newer version/);
  } finally { db.native.close(); }
});
