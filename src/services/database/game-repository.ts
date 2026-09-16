import { normalizePlayerColor } from '../../constants/player-colors';
import type { Game } from '../../types/game';
import type { GameSnapshot, GameSummary, SavedGame, ScoreEvent } from '../../types/history';
import type { ScoreChangeMethod } from '../../types/scoring';
import type { ScoreboardLayout } from '../../utils/scoreboard-layout';
import { applyScoreChange, getScoreChangeError } from '../scoring';
import type { DatabaseConnection } from './migrations';

export class GameOperationError extends Error {}

type GameRow = { id: string; name: string | null; layout: ScoreboardLayout; createdAt: number; updatedAt: number };

// Owns all access to this database connection. Reads and writes share one queue so
// an unrelated query cannot accidentally join another operation's async transaction.
export class GameRepository {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly db: DatabaseConnection) {}

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.tail.then(work);
    this.tail = next.catch(() => undefined);
    return next;
  }

  private transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      let result!: T;
      await this.db.withTransactionAsync(async () => { result = await work(); });
      return result;
    });
  }

  private async snapshot(gameId: string): Promise<GameSnapshot> {
    const row = await this.db.getFirstAsync<GameRow>(
      'SELECT id, name, layout, created_at AS createdAt, updated_at AS updatedAt FROM games WHERE id = ?', gameId,
    );
    if (!row) throw new GameOperationError('This game could not be found. Return Home to choose another game.');
    const players = await this.db.getAllAsync<Game['players'][number]>(
      'SELECT id, name, color, score, display_order AS displayOrder FROM players WHERE game_id = ? AND is_deleted = 0 ORDER BY display_order', gameId,
    );
    const game: SavedGame = { ...row, name: row.name ?? undefined, players };
    const events = await this.db.getAllAsync<ScoreEvent>(`
      SELECT e.id, e.game_id AS gameId, e.player_id AS playerId, p.name AS playerName,
        e.type, e.amount, e.requested_amount AS requestedAmount, e.previous_score AS previousScore,
        e.new_score AS newScore, e.created_at AS createdAt, e.undone_at AS undoneAt, e.undo_of AS undoOf
      FROM score_events e JOIN players p ON p.id = e.player_id
      WHERE e.game_id = ? ORDER BY e.id DESC`, gameId);
    return { game, events };
  }

  listGames(): Promise<GameSummary[]> {
    return this.enqueue(() => this.db.getAllAsync<GameSummary>(`
      SELECT g.id, g.name, g.updated_at AS updatedAt, COUNT(p.id) AS playerCount
      FROM games g LEFT JOIN players p ON p.game_id = g.id AND p.is_deleted = 0
      WHERE g.status = 'active' GROUP BY g.id ORDER BY g.updated_at DESC, g.id`));
  }

  loadGame(gameId: string): Promise<GameSnapshot> {
    return this.enqueue(() => this.snapshot(gameId));
  }

  createGame(draft: Pick<Game, 'name' | 'players'>): Promise<GameSnapshot> {
    return this.transaction(async () => {
      if (draft.players.length < 1 || draft.players.length > 16) throw new GameOperationError('Create a game with 1 to 16 players.');
      const id = (await this.db.getFirstAsync<{ id: string }>('SELECT lower(hex(randomblob(16))) AS id'))!.id;
      const now = Date.now();
      await this.db.runAsync('INSERT INTO games (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', id, draft.name?.trim() || null, now, now);
      for (const [index, player] of draft.players.entries()) {
        const color = normalizePlayerColor(player.color);
        if (!color) throw new GameOperationError(`Choose a color for Player ${index + 1}.`);
        await this.db.runAsync(`INSERT INTO players (id, game_id, name, color, score, display_order)
          VALUES (?, ?, ?, ?, 0, ?)`, `${id}:${index}`, id, player.name.trim() || `Player ${index + 1}`, color, index);
      }
      return this.snapshot(id);
    });
  }

  changeScore(gameId: string, playerId: string, amount: number, method: ScoreChangeMethod, allowNegativeScores: boolean): Promise<GameSnapshot> {
    return this.transaction(async () => {
      const before = await this.snapshot(gameId);
      const player = before.game.players.find((item) => item.id === playerId);
      if (!player) throw new GameOperationError('This player is no longer available.');
      const error = getScoreChangeError(player.score, amount, method, allowNegativeScores);
      if (error) throw new GameOperationError(error);
      const updated = applyScoreChange(before.game, playerId, amount, method, allowNegativeScores)!;
      const score = updated.players.find((item) => item.id === playerId)!.score;
      // A no-op (including subtracting from zero with the floor enabled) needs no undo event.
      if (score === player.score) return before;
      const type = method === 'set' ? 'SET_SCORE' : amount < 0 ? 'SUBTRACT_SCORE' : 'ADD_SCORE';
      const now = Date.now();
      await this.db.runAsync('UPDATE players SET score = ? WHERE id = ? AND game_id = ?', score, playerId, gameId);
      await this.db.runAsync(`INSERT INTO score_events
        (game_id, player_id, type, amount, requested_amount, previous_score, new_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, gameId, playerId, type, score - player.score, amount, player.score, score, now);
      await this.db.runAsync('UPDATE games SET updated_at = ? WHERE id = ?', now, gameId);
      return this.snapshot(gameId);
    });
  }

  undo(gameId: string): Promise<GameSnapshot> {
    return this.transaction(async () => {
      const before = await this.snapshot(gameId);
      const event = before.events.find((item) => item.type !== 'UNDO' && item.undoneAt === null);
      if (!event) return before;
      // Use the historical player row even if it is soft-deleted in a future milestone.
      const player = await this.db.getFirstAsync<{ score: number }>('SELECT score FROM players WHERE id = ? AND game_id = ?', event.playerId, gameId);
      if (!player || player.score !== event.newScore) throw new GameOperationError('The score has changed since this event. Reload the game before trying Undo.');
      const now = Date.now();
      await this.db.runAsync('UPDATE players SET score = ? WHERE id = ? AND game_id = ?', event.previousScore, event.playerId, gameId);
      await this.db.runAsync('UPDATE score_events SET undone_at = ? WHERE id = ?', now, event.id);
      await this.db.runAsync(`INSERT INTO score_events
        (game_id, player_id, type, amount, requested_amount, previous_score, new_score, created_at, undo_of)
        VALUES (?, ?, 'UNDO', ?, ?, ?, ?, ?, ?)`, gameId, event.playerId,
      event.previousScore - player.score, event.previousScore - player.score, player.score, event.previousScore, now, event.id);
      await this.db.runAsync('UPDATE games SET updated_at = ? WHERE id = ?', now, gameId);
      return this.snapshot(gameId);
    });
  }

  setLayout(gameId: string, layout: ScoreboardLayout): Promise<GameSnapshot> {
    return this.transaction(async () => {
      await this.db.runAsync('UPDATE games SET layout = ? WHERE id = ?', layout, gameId);
      return this.snapshot(gameId);
    });
  }
}
