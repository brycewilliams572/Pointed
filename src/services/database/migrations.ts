import type { SQLiteDatabase } from 'expo-sqlite';

export type DatabaseConnection = Pick<SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'withTransactionAsync'>;

export async function migrateDatabase(db: DatabaseConnection) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (version > 1) throw new Error('This database was created by a newer version of Pointed.');
  if (version === 1) return;
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
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
  });
}
