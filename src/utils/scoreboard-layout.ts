export type ScoreboardLayout = 'grid' | 'list';

export function getGridColumns(width: number, playerCount: number, fontScale: number): number {
  // Two 48-point controls per row, with room for larger system text.
  const minimumCardWidth = 156 * Math.max(1, fontScale);
  return Math.max(1, Math.min(playerCount, 4, Math.floor((width + 12) / (minimumCardWidth + 12))));
}
