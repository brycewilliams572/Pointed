// Foregrounds are paired with backgrounds for readable text in either theme.
export const PLAYER_COLORS = [
  { name: 'Red', background: '#B91C1C', foreground: '#FFFFFF' },
  { name: 'Orange', background: '#C2410C', foreground: '#FFFFFF' },
  { name: 'Yellow', background: '#FACC15', foreground: '#000000' },
  { name: 'Green', background: '#15803D', foreground: '#FFFFFF' },
  { name: 'Teal', background: '#0F766E', foreground: '#FFFFFF' },
  { name: 'Blue', background: '#1D4ED8', foreground: '#FFFFFF' },
  { name: 'Purple', background: '#7E22CE', foreground: '#FFFFFF' },
  { name: 'Pink', background: '#BE185D', foreground: '#FFFFFF' },
  { name: 'Gray', background: '#4B5563', foreground: '#FFFFFF' },
] as const;

export function getPlayerColor(color: string) {
  return PLAYER_COLORS.find((option) => option.background === color) ?? PLAYER_COLORS[0];
}
