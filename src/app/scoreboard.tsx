import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { arcadeColors, arcadeSurface, GameScreenHeader, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
import { PlayerCard } from '@/components/player-card';
import { ScoreEntryModal } from '@/components/score-entry-modal';
import { useGame } from '@/context/game-context';
import { useSettings } from '@/context/settings-context';
import type { Player } from '@/types/game';
import type { ScoreChangeMethod } from '@/types/scoring';
import { getGridColumns } from '@/utils/scoreboard-layout';

type Pending = { playerId: string; amount: number; method: ScoreChangeMethod; expectedScore: number };

export default function ScoreboardScreen() {
  const {
    game: loadedGame, events, canUndo, canRedo, redo, changeScore, scoreError, layout, setLayout,
    openGame, loadingGame, saving, undo,
  } = useGame();
  const { allowNegativeScores } = useSettings();
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const game = !gameId || loadedGame?.id === gameId ? loadedGame : null;
  const router = useRouter();
  const appearance = useGameScreenAppearance();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [contentWidth, setContentWidth] = useState(342);
  const [entry, setEntry] = useState<Player | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  useFocusEffect(useCallback(() => { if (gameId) void openGame(gameId); }, [gameId, openGame]));
  useEffect(() => {
    if (scoreError) AccessibilityInfo.announceForAccessibility(scoreError);
  }, [scoreError]);
  const columns = layout === 'list' ? 1 : getGridColumns(contentWidth, game?.players.length ?? 1, fontScale);
  const cardWidth = (contentWidth - 10 * (columns - 1)) / columns;
  const pendingPlayer = pending && game?.players.find((player) => player.id === pending.playerId);
  const pendingTarget = pendingPlayer && pending
    ? (pending.method === 'set' ? pending.amount : allowNegativeScores ? pendingPlayer.score + pending.amount : Math.max(0, pendingPlayer.score + pending.amount))
    : undefined;
  const lastEvent = events[0];
  const turnCount = new Set(events.filter((event) => !['UNDO', 'REDO'].includes(event.type)).map((event) => event.batchId)).size;

  function queuePreview(playerId: string, amount: number, method: ScoreChangeMethod, expectedScore: number) {
    setPending({ playerId, amount, method, expectedScore });
    setEntry(null);
  }

  async function endTurn() {
    if (!pending) {
      const first = game?.players[0];
      if (first) setEntry(first);
      return;
    }
    if (await changeScore(pending.playerId, pending.amount, pending.method, pending.expectedScore)) setPending(null);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, { paddingTop: Math.max(66, insets.top + 4) }]}>
        <GameScreenHeader title="Scoreboard" subtitle={game?.name ?? 'Your game'} backLabel="Home"
          onBack={() => router.replace('/')} fontsLoaded={appearance.fontsLoaded}
          trailing={[
            {
              accessibilityLabel: 'Score history',
              icon: require('../../assets/images/figma-game/pause-chart.svg'),
              onPress: () => game && router.push({ pathname: '/history', params: { gameId: game.id } }),
            },
            {
              accessibilityLabel: 'Game settings',
              icon: require('../../assets/images/figma-game/settings.svg'),
              onPress: () => router.push('/game-settings' as Href),
            },
          ]}
        />
        <View style={styles.layoutControls} pointerEvents="box-none">
          {(['grid', 'list'] as const).map((mode) => (
            <Pressable key={mode} accessibilityRole="button"
              accessibilityLabel={`${mode === 'grid' ? 'Grid' : 'List'} view`}
              accessibilityState={{ selected: layout === mode }}
              onPress={() => setLayout(mode)} style={styles.layoutControl}>
              <Text>{mode}</Text>
            </Pressable>
          ))}
        </View>
        {game ? (
          <View style={styles.gameArea}>
            <View style={styles.roundSelector} accessibilityLabel="Round 1">
              <Text style={[styles.roundLabel, appearance.fontsLoaded && gameFonts.display]}>ROUND</Text>
              {['1', '2', '3', 'FINAL'].map((round, index) => (
                <View key={round} style={[styles.roundOption, index === 0 && styles.roundSelected, round === 'FINAL' && styles.finalOption]}>
                  <Text style={[styles.roundOptionText, appearance.fontsLoaded && gameFonts.display, index === 0 && styles.roundSelectedText]}>{round}</Text>
                </View>
              ))}
            </View>
            <ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never"
              contentContainerStyle={styles.content}>
              <View style={styles.cards} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
                {game.players.map((player) => {
                  const isPending = pending?.playerId === player.id;
                  return (
                    <View key={player.id} style={{ width: cardWidth }}>
                      <PlayerCard player={player} layout={layout} onPress={setEntry}
                        disabled={saving || loadingGame} fontsLoaded={appearance.fontsLoaded}
                        pendingAmount={isPending ? pending.amount : undefined}
                        pendingTarget={isPending ? pendingTarget : undefined}
                      />
                    </View>
                  );
                })}
              </View>
              <View style={styles.spacer} />
              <View style={styles.footer}>
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Undo last score change"
                    accessibilityState={{ disabled: !canUndo || saving }} disabled={!canUndo || saving}
                    onPress={() => void undo()} style={({ pressed }) => [styles.action, styles.sideAction, styles.lightAction, (!canUndo || saving) && styles.disabled, pressed && styles.pressed]}>
                    <Image source={require('../../assets/images/figma-game/undo.svg')} accessible={false} contentFit="contain" style={styles.actionIcon} />
                    <Text style={[styles.actionText, appearance.fontsLoaded && gameFonts.display]}>Undo</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={pending ? 'End turn and save score' : 'Choose player to score'}
                    accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={() => void endTurn()}
                    style={({ pressed }) => [styles.action, styles.endAction, styles.primaryAction, pressed && styles.pressed]}>
                    <Image source={require('../../assets/images/figma-game/check.svg')} accessible={false} contentFit="contain" style={styles.actionIcon} />
                    <Text style={[styles.actionText, appearance.fontsLoaded && gameFonts.display]}>End turn</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Redo last undone score change"
                    accessibilityState={{ disabled: !canRedo || saving }} disabled={!canRedo || saving}
                    onPress={() => void redo()} style={({ pressed }) => [styles.action, styles.sideAction, styles.lightAction, (!canRedo || saving) && styles.disabled, pressed && styles.pressed]}>
                    <Text style={[styles.actionText, appearance.fontsLoaded && gameFonts.display]}>Redo</Text>
                    <Image source={require('../../assets/images/figma-game/redo.svg')} accessible={false} contentFit="contain" style={styles.actionIcon} />
                  </Pressable>
                </View>
                <View style={styles.statusRow}>
                  <Text numberOfLines={1} style={[styles.status, appearance.fontsLoaded && gameFonts.regular]}>
                    {lastEvent ? `Last play · ${lastEvent.playerName} ${lastEvent.amount >= 0 ? '+' : ''}${lastEvent.amount}` : 'No plays yet'}
                  </Text>
                  <Text style={[styles.turn, appearance.fontsLoaded && gameFonts.bold]}>Turn {turnCount || 1}</Text>
                </View>
                <Text style={[styles.hint, appearance.fontsLoaded && gameFonts.regular]}>
                  {pending ? 'End turn to confirm' : 'Tap a player to score'}
                </Text>
                {scoreError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{scoreError}</Text> : null}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, appearance.fontsLoaded && gameFonts.display]}>
              {loadingGame ? 'Loading game…' : scoreError ?? 'Choose a saved game or create a new one.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.primaryAction}>
              <Text style={[styles.actionText, appearance.fontsLoaded && gameFonts.display]}>Home</Text>
            </Pressable>
          </View>
        )}
        {entry && game?.players.some((player) => player.id === entry.id) ? (
          <ScoreEntryModal key={entry.id} player={entry} onPreview={queuePreview} onClose={() => setEntry(null)} />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: arcadeColors.navy },
  gameArea: { flex: 1, width: '100%', maxWidth: 390, alignSelf: 'center' },
  layoutControls: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  layoutControl: { width: 1, height: 1 },
  roundSelector: { height: 34, marginTop: 16, marginHorizontal: 24, flexDirection: 'row', gap: 8, alignItems: 'center' },
  roundLabel: { width: 66, color: arcadeColors.white, fontSize: 11, lineHeight: 12, fontWeight: '900' },
  roundOption: { minWidth: 42, height: 32, borderWidth: 3, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.panelRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  roundSelected: { backgroundColor: arcadeColors.yellow, boxShadow: '5px 5px 0px #000000' },
  roundOptionText: { color: arcadeColors.muted, fontSize: 11, lineHeight: 12, fontWeight: '900' },
  roundSelectedText: { color: arcadeColors.ink },
  finalOption: { minWidth: 64 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12 },
  cards: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' },
  spacer: { flexGrow: 1, minHeight: 28 },
  footer: { width: '100%', gap: 0 },
  actions: { height: 48, flexDirection: 'row', gap: 12 },
  action: { ...arcadeSurface, height: 48, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  sideAction: { width: 80 },
  endAction: { flex: 1 },
  lightAction: { backgroundColor: arcadeColors.white },
  primaryAction: { backgroundColor: arcadeColors.yellow },
  actionIcon: { width: 16, height: 16 },
  actionText: { color: arcadeColors.ink, fontSize: 13, lineHeight: 15, fontWeight: '900' },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.72, transform: [{ translateX: 1 }, { translateY: 1 }] },
  statusRow: { height: 13, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { color: arcadeColors.muted, fontSize: 11, lineHeight: 13 },
  turn: { color: arcadeColors.muted, fontSize: 11, lineHeight: 13, fontWeight: '800' },
  hint: { color: arcadeColors.muted, marginTop: 16, fontSize: 10, lineHeight: 12, textAlign: 'center' },
  error: { color: arcadeColors.white, marginTop: 4, fontSize: 10, lineHeight: 12, textAlign: 'center' },
  empty: { flex: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: arcadeColors.white, fontSize: 18, textAlign: 'center' },
});
