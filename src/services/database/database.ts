import { openDatabaseAsync } from 'expo-sqlite';

import { GameRepository } from './game-repository';
import { migrateDatabase } from './migrations';

let pending: Promise<GameRepository> | null = null;

export function getGameRepository(): Promise<GameRepository> {
  if (!pending) {
    pending = (async () => {
      const db = await openDatabaseAsync('pointed.db');
      try {
        await migrateDatabase(db);
        return new GameRepository(db);
      } catch (error) {
        await db.closeAsync();
        throw error;
      }
    })().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}
