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

export function getBrowserStorageError(error: unknown): string | null {
  if (process.env.EXPO_OS !== 'web' || !(error instanceof Error)) return null;
  if (!/navigator\.storage|secure context|access handle|opfs|vfs|sharedarraybuffer/i.test(error.message)) {
    return null;
  }
  return 'Browser storage is unavailable. Open Pointed over HTTPS in a regular (non-Private) browser window, then try again.';
}
