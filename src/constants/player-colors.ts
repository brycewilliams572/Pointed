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

export function normalizePlayerColor(value: string): string | null {
  const hex = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(hex)) {
    return `#${hex.split('').map((digit) => digit + digit).join('').toUpperCase()}`;
  }
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}

export function getPlayerColor(color: string) {
  const background = normalizePlayerColor(color) ?? PLAYER_COLORS[0].background;
  const preset = PLAYER_COLORS.find((option) => option.background === background);
  // Choose whichever foreground has the greater WCAG contrast ratio.
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(background.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const foreground = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? '#000000' : '#FFFFFF';
  return { name: preset?.name ?? `Custom color ${background}`, background, foreground };
}
