import type { Game } from './game';
import type { ScoreboardLayout } from '../utils/scoreboard-layout';

export interface SavedGame extends Game {
  layout: ScoreboardLayout;
  createdAt: number;
  updatedAt: number;
  startingScore: number;
}

export interface GameSummary {
  id: string;
  name: string | null;
  playerCount: number;
  updatedAt: number;
  status: 'active' | 'completed';
}

export interface ScoreEvent {
  id: number;
  gameId: string;
  playerId: string;
  playerName: string;
  type: 'ADD_SCORE' | 'SUBTRACT_SCORE' | 'SET_SCORE' | 'UNDO' | 'REDO' | 'RESTORE';
  amount: number;
  requestedAmount: number;
  previousScore: number;
  newScore: number;
  createdAt: number;
  undoneAt: number | null;
  undoOf: number | null;
  actionId: number | null;
  batchId: string;
  actionState: 'applied' | 'undone' | 'abandoned' | null;
  restoreTarget: number | null;
}

export interface GameSnapshot {
  game: SavedGame;
  events: ScoreEvent[];
  canUndo: boolean;
  canRedo: boolean;
}
