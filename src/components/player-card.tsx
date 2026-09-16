import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPlayerColor } from '@/constants/player-colors';
import { SCORE_PRESETS } from '@/services/scoring';
import type { Player } from '@/types/game';
import type { ScoreboardLayout } from '@/utils/scoreboard-layout';

type Props = {
  player: Player;
  layout: ScoreboardLayout;
  onScoreChange: (playerId: string, amount: number) => void;
};

export function PlayerCard({ player, layout, onScoreChange }: Props) {
  const color = getPlayerColor(player.color);
  return (
    <View style={[styles.card, { backgroundColor: color.background }]}>
      <Text accessibilityRole="header" style={[styles.name, { color: color.foreground }]}>{player.name}</Text>
      <Text
        accessibilityLabel={`${player.name}, score ${player.score}`}
        accessibilityLiveRegion="polite"
        style={[styles.score, layout === 'grid' && styles.gridScore, { color: color.foreground }]}>
        {player.score}
      </Text>
      <View style={styles.buttons}>
        {SCORE_PRESETS.map((amount) => (
          <Pressable
            key={amount}
            accessibilityRole="button"
            accessibilityLabel={`Add ${amount} ${amount === 1 ? 'point' : 'points'} to ${player.name}`}
            onPress={() => onScoreChange(player.id, amount)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: color.foreground },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.buttonLabel, { color: color.background }]}>+{amount}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, padding: 12, gap: 12 },
  name: { fontSize: 20, fontWeight: '600' },
  score: { fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 1 },
  gridScore: { textAlign: 'center', paddingVertical: 8 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 'auto' },
  button: { flexGrow: 1, minWidth: 48, minHeight: 48, borderRadius: 10, padding: 10, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontSize: 18, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
