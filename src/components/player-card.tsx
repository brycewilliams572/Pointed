import { StyleSheet, Text, View } from 'react-native';

import { getPlayerColor } from '@/constants/player-colors';
import type { Player } from '@/types/game';

export function PlayerCard({ player }: { player: Player }) {
  const color = getPlayerColor(player.color);
  return (
    <View accessible accessibilityLabel={`${player.name}, ${color.name}, score ${player.score}`} style={[styles.card, { backgroundColor: color.background }]}>
      <Text style={[styles.name, { color: color.foreground }]}>{player.name}</Text>
      <Text style={[styles.color, { color: color.foreground }]}>{color.name}</Text>
      <Text style={[styles.score, { color: color.foreground }]}>Score: {player.score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20, gap: 8 },
  name: { fontSize: 22, fontWeight: '600' },
  color: { fontSize: 16 },
  score: { fontSize: 28, fontWeight: '700' },
});
