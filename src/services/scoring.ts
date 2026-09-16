import type { Game } from '../types/game';
import type { ScoreChangeMethod, ScoreInputResult } from '../types/scoring';

export const SCORE_PRESETS = [1, 5, 10, 20] as const;
export const MAX_SCORE = 999_999_999;

export function parseScoreInput(input: string, method: 'manual' | 'set', allowNegativeScores: boolean): ScoreInputResult {
  const text = input.trim();
  if (!text) return { error: method === 'set' ? 'Enter the new score.' : 'Enter the points to add.' };
  if (!/^[+-]?\d+$/.test(text)) return { error: 'Enter a whole number, without decimals or other characters.' };
  const value = Number(text);
  if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_SCORE) {
    return { error: `Enter a number between ${allowNegativeScores ? -MAX_SCORE : 0} and ${MAX_SCORE}.` };
  }
  if (value < 0 && !allowNegativeScores) {
    return { error: 'Negative values are off. Enable Allow negative scores in Settings to enter a negative value.' };
  }
  return { value };
}

export function getScoreChangeError(currentScore: number, amount: number, method: ScoreChangeMethod): string | null {
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > MAX_SCORE) return `Use a whole number between ${-MAX_SCORE} and ${MAX_SCORE}.`;
  if (method === 'preset' && amount <= 0) return 'Preset points must be greater than 0.';
  const next = method === 'set' ? amount : currentScore + amount;
  if (!Number.isSafeInteger(next) || Math.abs(next) > MAX_SCORE) return `The resulting score must stay between ${-MAX_SCORE} and ${MAX_SCORE}.`;
  return null;
}

// Pure state transition: the provider owns state; future persistence can wrap this boundary.
export function applyScoreChange(
  game: Game | null,
  playerId: string,
  amount: number,
  method: ScoreChangeMethod = 'preset',
  allowNegativeScores = false,
): Game | null {
  if (!game) return game;
  const player = game.players.find((item) => item.id === playerId);
  if (!player || getScoreChangeError(player.score, amount, method)) return game;
  const requested = method === 'set' ? amount : player.score + amount;
  const score = allowNegativeScores ? requested : Math.max(0, requested);
  if (score === player.score) return game;

  return {
    ...game,
    players: game.players.map((item) =>
      item.id === playerId ? { ...item, score } : item
    ),
  };
}
