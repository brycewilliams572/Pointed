import type { Game } from '../types/game';

export const SCORE_PRESETS = [1, 5, 10, 20] as const;

// Pure state transition: the provider owns state; future persistence can wrap this boundary.
export function applyScoreChange(game: Game | null, playerId: string, amount: number): Game | null {
  if (!game || !Number.isSafeInteger(amount) || amount <= 0) return game;
  const player = game.players.find((item) => item.id === playerId);
  if (!player || !Number.isSafeInteger(player.score + amount)) return game;

  return {
    ...game,
    players: game.players.map((item) =>
      item.id === playerId ? { ...item, score: item.score + amount } : item
    ),
  };
}
