import { normalizePlayerColor } from '../../constants/player-colors';
import type { Game } from '../../types/game';
import type { GameSnapshot, GameSummary, SavedGame, ScoreEvent } from '../../types/history';
import type { ScoreChangeMethod } from '../../types/scoring';
import type { ScoreboardLayout } from '../../utils/scoreboard-layout';
import { applyScoreChange, getScoreChangeError } from '../scoring';
import { getHistoryPoint } from '../history';
import type { DatabaseConnection } from './migrations';

export class GameOperationError extends Error {}

type GameRow = { id: string; name: string | null; layout: ScoreboardLayout; createdAt: number; updatedAt: number; startingScore: number };

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
      'SELECT id, name, layout, starting_score AS startingScore, created_at AS createdAt, updated_at AS updatedAt FROM games WHERE id = ?', gameId,
    );
    if (!row) throw new GameOperationError('This game could not be found. Return Home to choose another game.');
    const players = await this.db.getAllAsync<Game['players'][number]>(
      'SELECT id, name, color, score, display_order AS displayOrder FROM players WHERE game_id = ? AND is_deleted = 0 ORDER BY display_order', gameId,
    );
    const game: SavedGame = { ...row, name: row.name ?? undefined, players };
    const events = await this.db.getAllAsync<ScoreEvent>(`
      SELECT e.id, e.game_id AS gameId, e.player_id AS playerId, p.name AS playerName,
        e.type, e.amount, e.requested_amount AS requestedAmount, e.previous_score AS previousScore,
        e.new_score AS newScore, e.created_at AS createdAt, e.undone_at AS undoneAt, e.undo_of AS undoOf,
        e.action_id AS actionId, e.batch_id AS batchId, a.state AS actionState, a.restore_target AS restoreTarget
      FROM score_events e JOIN players p ON p.id = e.player_id
      LEFT JOIN score_actions a ON a.id = e.action_id
      WHERE e.game_id = ? ORDER BY e.id DESC`, gameId);
    return { game, events, canUndo: events.some((event) => event.actionState === 'applied'),
      canRedo: events.some((event) => event.actionState === 'undone') };
  }

  listGames(): Promise<GameSummary[]> {
    return this.enqueue(() => this.db.getAllAsync<GameSummary>(`
      SELECT g.id, g.name, g.status, g.updated_at AS updatedAt, COUNT(p.id) AS playerCount
      FROM games g LEFT JOIN players p ON p.game_id = g.id AND p.is_deleted = 0
      GROUP BY g.id ORDER BY g.updated_at DESC, g.id`));
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

  changeScore(gameId: string, playerId: string, amount: number, method: ScoreChangeMethod, allowNegativeScores: boolean, expectedScore?: number): Promise<GameSnapshot> {
    return this.transaction(async () => {
      const before = await this.snapshot(gameId);
      const player = before.game.players.find((item) => item.id === playerId);
      if (!player) throw new GameOperationError('This player is no longer available.');
      if (expectedScore !== undefined && player.score !== expectedScore) {
        throw new GameOperationError('The score changed while this menu was open. Close it and try again.');
      }
      const error = getScoreChangeError(player.score, amount, method, allowNegativeScores);
      if (error) throw new GameOperationError(error);
      const updated = applyScoreChange(before.game, playerId, amount, method, allowNegativeScores)!;
      const score = updated.players.find((item) => item.id === playerId)!.score;
      // A no-op (including subtracting from zero with the floor enabled) needs no undo event.
      if (score === player.score) return before;
      const type = method === 'set' ? 'SET_SCORE' : amount < 0 ? 'SUBTRACT_SCORE' : 'ADD_SCORE';
      const now = Date.now();
      const actionId = await this.startAction(gameId);
      const batchId = await this.newBatch();
      await this.db.runAsync('UPDATE players SET score = ? WHERE id = ? AND game_id = ?', score, playerId, gameId);
      await this.db.runAsync(`INSERT INTO score_events
        (game_id, player_id, type, amount, requested_amount, previous_score, new_score, created_at, action_id, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, gameId, playerId, type, score - player.score, amount, player.score, score, now, actionId, batchId);
      await this.db.runAsync('UPDATE games SET updated_at = ? WHERE id = ?', now, gameId);
      return this.snapshot(gameId);
    });
  }

  undo(gameId: string): Promise<GameSnapshot> {
    return this.reverseAction(gameId, 'UNDO');
  }

  redo(gameId: string): Promise<GameSnapshot> {
    return this.reverseAction(gameId, 'REDO');
  }

  private async newBatch(): Promise<string> {
    return (await this.db.getFirstAsync<{ id: string }>('SELECT lower(hex(randomblob(16))) AS id'))!.id;
  }

  private async startAction(gameId: string, restoreTarget: number | null = null): Promise<number> {
    await this.db.runAsync("UPDATE score_actions SET state = 'abandoned', undo_order = NULL WHERE game_id = ? AND state = 'undone'", gameId);
    const result = await this.db.runAsync("INSERT INTO score_actions (game_id, state, restore_target) VALUES (?, 'applied', ?)", gameId, restoreTarget);
    return result.lastInsertRowId;
  }

  private reverseAction(gameId: string, type: 'UNDO' | 'REDO'): Promise<GameSnapshot> {
    return this.transaction(async () => {
      const before = await this.snapshot(gameId);
      const action = await this.db.getFirstAsync<{ id: number }>(type === 'UNDO'
        ? "SELECT id FROM score_actions WHERE game_id = ? AND state = 'applied' ORDER BY id DESC LIMIT 1"
        : "SELECT id FROM score_actions WHERE game_id = ? AND state = 'undone' ORDER BY undo_order DESC LIMIT 1", gameId);
      if (!action) return before;
      const changes = before.events.filter((event) => event.actionId === action.id);
      const now = Date.now();
      const batchId = await this.newBatch();
      let order = 0;
      for (const event of changes) {
        const player = await this.db.getFirstAsync<{ score: number }>('SELECT score FROM players WHERE id = ? AND game_id = ?', event.playerId, gameId);
        const expected = type === 'UNDO' ? event.newScore : event.previousScore;
        const target = type === 'UNDO' ? event.previousScore : event.newScore;
        if (!player || player.score !== expected) throw new GameOperationError('The saved score does not match this action. Reload the game before trying again.');
        await this.db.runAsync('UPDATE players SET score = ? WHERE id = ? AND game_id = ?', target, event.playerId, gameId);
        await this.db.runAsync('UPDATE score_events SET undone_at = ? WHERE id = ?', type === 'UNDO' ? now : null, event.id);
        const result = await this.db.runAsync(`INSERT INTO score_events
          (game_id, player_id, type, amount, requested_amount, previous_score, new_score, created_at, undo_of, batch_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, gameId, event.playerId, type,
        target - player.score, target - player.score, player.score, target, now, event.id, batchId);
        order = result.lastInsertRowId;
      }
      await this.db.runAsync('UPDATE score_actions SET state = ?, undo_order = ? WHERE id = ?',
        type === 'UNDO' ? 'undone' : 'applied', type === 'UNDO' ? order : null, action.id);
      await this.db.runAsync('UPDATE games SET updated_at = ? WHERE id = ?', now, gameId);
      return this.snapshot(gameId);
    });
  }

  restoreHistory(gameId: string, eventId: number): Promise<GameSnapshot> {
    return this.transaction(async () => {
      const before = await this.snapshot(gameId);
      const point = getHistoryPoint(before, eventId);
      if (!point) throw new GameOperationError('This history point could not be found. Reload history and try again.');
      const { endpoint, scores: targets } = point;
      const changed = before.game.players.filter((player) => player.score !== targets.get(player.id));
      if (!changed.length) return before;
      const actionId = await this.startAction(gameId, endpoint);
      const batchId = await this.newBatch();
      const now = Date.now();
      for (const player of changed) {
        const target = targets.get(player.id)!;
        await this.db.runAsync('UPDATE players SET score = ? WHERE id = ? AND game_id = ?', target, player.id, gameId);
        await this.db.runAsync(`INSERT INTO score_events
          (game_id, player_id, type, amount, requested_amount, previous_score, new_score, created_at, action_id, batch_id)
          VALUES (?, ?, 'RESTORE', ?, ?, ?, ?, ?, ?, ?)`, gameId, player.id, target - player.score,
        target - player.score, player.score, target, now, actionId, batchId);
      }
      await this.db.runAsync('UPDATE games SET updated_at = ? WHERE id = ?', now, gameId);
      return this.snapshot(gameId);
    });
  }

  deleteGame(gameId: string): Promise<void> {
    return this.transaction(async () => {
      // Remove self-references before deleting the audit log; foreign keys stay on.
      await this.db.runAsync('UPDATE score_events SET undo_of = NULL WHERE game_id = ?', gameId);
      await this.db.runAsync('DELETE FROM score_events WHERE game_id = ?', gameId);
      await this.db.runAsync('DELETE FROM score_actions WHERE game_id = ?', gameId);
      await this.db.runAsync('DELETE FROM players WHERE game_id = ?', gameId);
      await this.db.runAsync('DELETE FROM games WHERE id = ?', gameId);
    });
  }

  setLayout(gameId: string, layout: ScoreboardLayout): Promise<GameSnapshot> {
    return this.transaction(async () => {
      await this.db.runAsync('UPDATE games SET layout = ? WHERE id = ?', layout, gameId);
      return this.snapshot(gameId);
    });
  }
}
