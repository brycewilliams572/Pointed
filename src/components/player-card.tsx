import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { arcadeColors, arcadeSurface, gameFonts } from '@/components/game-screen-chrome';
import { getPlayerColor } from '@/constants/player-colors';
import type { Player } from '@/types/game';
import type { ScoreboardLayout } from '@/utils/scoreboard-layout';

type Props = {
  player: Player;
  layout: ScoreboardLayout;
  onPress: (player: Player) => void;
  disabled?: boolean;
  fontsLoaded?: boolean;
  pendingAmount?: number;
  pendingTarget?: number;
};

export const PlayerCard = memo(function PlayerCard({
  player, layout, onPress, disabled, fontsLoaded, pendingAmount, pendingTarget,
}: Props) {
  const color = getPlayerColor(player.color);
  const compact = layout === 'grid';
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
      withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
    );
  }, [player.score, scoreScale]);

  function setPressed(pressed: boolean) {
    cardScale.value = withTiming(pressed ? 0.985 : 1, {
      duration: pressed ? 70 : 110,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }

  const hasPending = pendingAmount !== undefined && pendingTarget !== undefined;
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={`${player.name}, score ${player.score}${hasPending ? `, pending ${pendingAmount}` : ''}`}
      accessibilityHint="Opens scoring controls. Changes require End turn confirmation."
      accessibilityState={{ disabled: !!disabled }} disabled={disabled}
      onPress={() => onPress(player)} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
      style={styles.pressTarget}>
      <Animated.View style={[styles.card, !compact && styles.listCard, { backgroundColor: color.background }, cardMotion]}>
        <Text numberOfLines={1} style={[styles.name, fontsLoaded && gameFonts.display, { color: color.foreground }]}>{player.name}</Text>
        <Animated.View style={[styles.scoreRow, scoreMotion]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.score, fontsLoaded && gameFonts.display, { color: color.foreground }]}>{player.score}</Text>
          {hasPending ? (
            <View style={styles.pendingRow}>
              <Text style={[styles.pending, fontsLoaded && gameFonts.display, { color: color.foreground }]}>
                {pendingAmount! >= 0 ? '+' : ''}{pendingAmount} =
              </Text>
              <Text style={[styles.score, fontsLoaded && gameFonts.display, { color: color.foreground }]}>{pendingTarget}</Text>
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressTarget: { flex: 1, minWidth: 0 },
  card: { ...arcadeSurface, height: 88, padding: 6, gap: 5, overflow: 'hidden' },
  listCard: { minHeight: 88, width: '100%' },
  name: { fontSize: 13, lineHeight: 14, fontWeight: '900' },
  scoreRow: { minHeight: 40, flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  pendingRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 7, minWidth: 0 },
  score: { fontSize: 30, lineHeight: 34, fontWeight: '900', fontVariant: ['tabular-nums'] },
  pending: { flexShrink: 1, fontSize: 20, lineHeight: 30, fontWeight: '900' },
  muted: { color: arcadeColors.muted },
});
