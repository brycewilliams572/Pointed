import type { Game } from './game';
import type { ScoreboardLayout } from '../utils/scoreboard-layout';

export interface SavedGame extends Game {
  layout: ScoreboardLayout;
  createdAt: number;
  updatedAt: number;
}

export interface GameSummary {
  id: string;
  name: string | null;
  playerCount: number;
  updatedAt: number;
}

export interface ScoreEvent {
  id: number;
  gameId: string;
  playerId: string;
  playerName: string;
  type: 'ADD_SCORE' | 'SUBTRACT_SCORE' | 'SET_SCORE' | 'UNDO';
  amount: number;
  requestedAmount: number;
  previousScore: number;
  newScore: number;
  createdAt: number;
  undoneAt: number | null;
  undoOf: number | null;
}

export interface GameSnapshot {
  game: SavedGame;
  events: ScoreEvent[];
}
