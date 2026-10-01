import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getPlayerColor } from '@/constants/player-colors';
import type { Player } from '@/types/game';
import type { ScoreboardLayout } from '@/utils/scoreboard-layout';
import { gameFonts } from '@/components/game-screen-chrome';

type Props = { player: Player; layout: ScoreboardLayout; onPress: (player: Player) => void; disabled?: boolean; fontsLoaded?: boolean };

function cardShadow(color: string) {
  const channels = [1, 3, 5].map((offset) => Math.round(parseInt(color.slice(offset, offset + 2), 16) * 0.7));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export const PlayerCard = memo(function PlayerCard({ player, layout, onPress, disabled, fontsLoaded }: Props) {
  const color = getPlayerColor(player.color);
  const { fontScale } = useWindowDimensions();
  const grid = layout === 'grid';
  const gridScale = Math.max(1, fontScale);
  const previousScore = useRef(player.score);
  const cardScale = useSharedValue(1);
  const scoreScale = useSharedValue(1);
  const cardMotion = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const scoreMotion = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));

  useEffect(() => {
    if (previousScore.current === player.score) return;
    previousScore.current = player.score;
    scoreScale.value = withSequence(
      ReduceMotion.System,
      withTiming(1.045, { duration: 80, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System })
    );
  }, [player.score, scoreScale]);

  function setPressed(pressed: boolean) {
    cardScale.value = withTiming(pressed ? 0.985 : 1, {
      duration: pressed ? 70 : 110,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${player.name}, score ${player.score}`}
      accessibilityHint="Opens scoring controls. Changes require confirmation."
      accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={() => onPress(player)}
      onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={styles.pressTarget}>
      <Animated.View style={[
        styles.card,
        grid && [styles.gridCard, { height: 125 * gridScale, boxShadow: `3px 4px 0px ${cardShadow(color.background)}` }],
        { backgroundColor: color.background },
        cardMotion,
      ]}>
        <Text numberOfLines={grid ? 1 : undefined} style={[styles.name, { color: color.foreground }, grid && styles.gridName, grid && fontsLoaded && gameFonts.semibold]}>{player.name}</Text>
        <Animated.Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.35}
          style={[styles.score, { color: color.foreground, height: 64 * fontScale }, grid && [styles.gridScore, { top: 36 * gridScale }], grid && fontsLoaded && gameFonts.bold, scoreMotion]}>
          {player.score}
        </Animated.Text>
        {!grid ? <Text style={[styles.hint, { color: color.foreground }]}>Tap to score</Text> : null}
      </Animated.View>
    </Pressable>
  );
}, (previous, next) => previous.layout === next.layout && previous.onPress === next.onPress &&
  previous.disabled === next.disabled && previous.fontsLoaded === next.fontsLoaded &&
  previous.player.id === next.player.id && previous.player.name === next.player.name &&
  previous.player.score === next.player.score && previous.player.color === next.player.color &&
  previous.player.displayOrder === next.player.displayOrder);

const styles = StyleSheet.create({
  pressTarget: { flex: 1 },
  card: { flex: 1, borderRadius: 16, padding: 16, gap: 8, minHeight: 153 },
  name: { fontSize: 20, fontWeight: '600' },
  score: { fontSize: 44, lineHeight: 60, fontWeight: '700', fontVariant: ['tabular-nums'] },
  gridCard: { minHeight: 125, flex: 0, padding: 0 },
  gridName: { position: 'absolute', left: 16, right: 16, top: 16, lineHeight: 24 },
  gridScore: { position: 'absolute', left: 16, right: 16, textAlign: 'center' },
  hint: { fontSize: 14 },
});
