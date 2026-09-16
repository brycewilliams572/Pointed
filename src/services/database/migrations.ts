import type { SQLiteDatabase } from 'expo-sqlite';

export type DatabaseConnection = Pick<SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'withTransactionAsync'>;

export async function migrateDatabase(db: DatabaseConnection) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (version > 2) throw new Error('This database was created by a newer version of Pointed.');
  if (version === 2) return;
  await db.withTransactionAsync(async () => {
    if (version === 0) await db.execAsync(`
      CREATE TABLE games (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
        scoring_mode TEXT NOT NULL DEFAULT 'additive',
        starting_score INTEGER NOT NULL DEFAULT 0,
        layout TEXT NOT NULL DEFAULT 'grid' CHECK(layout IN ('grid', 'list')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      );
      CREATE TABLE players (
        id TEXT PRIMARY KEY NOT NULL,
        game_id TEXT NOT NULL REFERENCES games(id),
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN -999999999 AND 999999999),
        display_order INTEGER NOT NULL,
        is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
        UNIQUE(game_id, id)
      );
      CREATE TABLE score_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL REFERENCES games(id),
        player_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('ADD_SCORE', 'SUBTRACT_SCORE', 'SET_SCORE', 'UNDO')),
        amount INTEGER NOT NULL,
        requested_amount INTEGER NOT NULL,
        previous_score INTEGER NOT NULL,
        new_score INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        undone_at INTEGER,
        undo_of INTEGER UNIQUE REFERENCES score_events(id),
        FOREIGN KEY(game_id, player_id) REFERENCES players(game_id, id)
      );
      CREATE INDEX players_game ON players(game_id, display_order);
      CREATE INDEX events_game ON score_events(game_id, id DESC);
      CREATE INDEX games_active ON games(status, updated_at DESC);
      PRAGMA user_version = 1;
    `);
    // Preserve the v1 audit log and IDs. Legacy undone actions stay archived:
    // v1 did not persist a redo branch, so it cannot be inferred reliably.
    await db.execAsync(`
      CREATE TABLE score_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL REFERENCES games(id),
        state TEXT NOT NULL CHECK(state IN ('applied', 'undone', 'abandoned')),
        undo_order INTEGER,
        restore_target INTEGER,
        UNIQUE(game_id, id)
      );
      INSERT INTO score_actions (id, game_id, state)
        SELECT id, game_id, CASE WHEN undone_at IS NULL THEN 'applied' ELSE 'abandoned' END
        FROM score_events WHERE type != 'UNDO';
      CREATE TABLE score_events_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL REFERENCES games(id),
        player_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('ADD_SCORE', 'SUBTRACT_SCORE', 'SET_SCORE', 'UNDO', 'REDO', 'RESTORE')),
        amount INTEGER NOT NULL,
        requested_amount INTEGER NOT NULL,
        previous_score INTEGER NOT NULL CHECK(previous_score BETWEEN -999999999 AND 999999999),
        new_score INTEGER NOT NULL CHECK(new_score BETWEEN -999999999 AND 999999999),
        created_at INTEGER NOT NULL,
        undone_at INTEGER,
        undo_of INTEGER REFERENCES score_events_next(id),
        action_id INTEGER,
        batch_id TEXT NOT NULL,
        FOREIGN KEY(game_id, player_id) REFERENCES players(game_id, id),
        FOREIGN KEY(game_id, action_id) REFERENCES score_actions(game_id, id)
      );
      INSERT INTO score_events_next
        SELECT id, game_id, player_id, type, amount, requested_amount, previous_score,
          new_score, created_at, undone_at, undo_of,
          CASE WHEN type != 'UNDO' THEN id ELSE NULL END, 'legacy-' || id
        FROM score_events;
      DROP TABLE score_events;
      ALTER TABLE score_events_next RENAME TO score_events;
      CREATE INDEX events_game ON score_events(game_id, id DESC);
      CREATE INDEX events_action ON score_events(action_id);
      CREATE INDEX events_batch ON score_events(game_id, batch_id);
      CREATE INDEX actions_game ON score_actions(game_id, state, id DESC);
      PRAGMA user_version = 2;
    `);
  });
}
