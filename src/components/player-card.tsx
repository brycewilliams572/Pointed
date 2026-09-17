import { memo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { getPlayerColor } from '@/constants/player-colors';
import type { Player } from '@/types/game';
import type { ScoreboardLayout } from '@/utils/scoreboard-layout';
import { gameFonts } from '@/components/game-screen-chrome';

type Props = { player: Player; layout: ScoreboardLayout; onPress: (player: Player) => void; disabled?: boolean; fontsLoaded?: boolean };

export const PlayerCard = memo(function PlayerCard({ player, layout, onPress, disabled, fontsLoaded }: Props) {
  const color = getPlayerColor(player.color);
  const { fontScale } = useWindowDimensions();
  const grid = layout === 'grid';
  const gridScale = Math.max(1, fontScale);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${player.name}, score ${player.score}`}
      accessibilityHint="Opens scoring controls. Changes require confirmation."
      accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={() => onPress(player)}
      style={({ pressed }) => [styles.card, grid && [styles.gridCard, { height: 128 * gridScale }], { backgroundColor: color.background }, pressed && styles.pressed]}>
      <Text numberOfLines={grid ? 1 : undefined} style={[styles.name, { color: color.foreground }, grid && styles.gridName, grid && fontsLoaded && gameFonts.semibold]}>{player.name}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.35}
        style={[styles.score, { color: color.foreground, height: 64 * fontScale }, grid && [styles.gridScore, { top: 36 * gridScale }], grid && fontsLoaded && gameFonts.bold]}>
        {player.score}
      </Text>
      {!grid ? <Text style={[styles.hint, { color: color.foreground }]}>Tap to score</Text> : null}
    </Pressable>
  );
}, (previous, next) => previous.layout === next.layout && previous.onPress === next.onPress &&
  previous.disabled === next.disabled && previous.fontsLoaded === next.fontsLoaded &&
  previous.player.id === next.player.id && previous.player.name === next.player.name &&
  previous.player.score === next.player.score && previous.player.color === next.player.color &&
  previous.player.displayOrder === next.player.displayOrder);

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, padding: 16, gap: 8, minHeight: 144 },
  name: { fontSize: 20, fontWeight: '600' },
  score: { fontSize: 44, lineHeight: 60, fontWeight: '700', fontVariant: ['tabular-nums'] },
  gridCard: { minHeight: 128, flex: 0, padding: 0 },
  gridName: { position: 'absolute', left: 16, right: 16, top: 16, lineHeight: 24 },
  gridScore: { position: 'absolute', left: 16, right: 16, textAlign: 'center' },
  hint: { fontSize: 14 },
  pressed: { opacity: 0.75 },
});
