import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { getPlayerColor } from '@/constants/player-colors';
import type { Player } from '@/types/game';
import type { ScoreboardLayout } from '@/utils/scoreboard-layout';

type Props = { player: Player; layout: ScoreboardLayout; onPress: (player: Player) => void; disabled?: boolean };

export function PlayerCard({ player, layout, onPress, disabled }: Props) {
  const color = getPlayerColor(player.color);
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${player.name}, score ${player.score}`}
      accessibilityHint="Opens scoring controls. Changes require confirmation."
      accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={() => onPress(player)}
      style={({ pressed }) => [styles.card, { backgroundColor: color.background }, pressed && styles.pressed]}>
      <Text style={[styles.name, { color: color.foreground }]}>{player.name}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.35}
        style={[styles.score, { color: color.foreground, height: 64 * fontScale }, layout === 'grid' && styles.gridScore]}>
        {player.score}
      </Text>
      <Text style={[styles.hint, { color: color.foreground }]}>Tap to score</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, padding: 16, gap: 8, minHeight: 144 },
  name: { fontSize: 20, fontWeight: '600' },
  score: { fontSize: 44, lineHeight: 60, fontWeight: '700', fontVariant: ['tabular-nums'] },
  gridScore: { textAlign: 'center' },
  hint: { fontSize: 14 },
  pressed: { opacity: 0.75 },
});
