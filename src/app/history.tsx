import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { arcadeColors, arcadeSurface, GameScreenHeader, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
import { ConfirmActionModal } from '@/components/confirm-action-modal';
import { getPlayerColor } from '@/constants/player-colors';
import { useGame } from '@/context/game-context';
import { getHistoryPoint, groupHistory } from '@/services/history';
import type { ScoreEvent } from '@/types/history';

function actionDescription(event: ScoreEvent) {
  if (event.type === 'SET_SCORE') return 'set score';
  if (event.type === 'RESTORE') return 'restored history';
  if (event.type === 'UNDO') return 'undid points';
  if (event.type === 'REDO') return 'redid points';
  return event.amount >= 0 ? 'added points' : 'subtracted points';
}

function relativeTime(createdAt: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60_000));
  return minutes < 1 ? 'JUST NOW' : `${minutes} MIN`;
}

export default function HistoryScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { game, events, openGame, loadingGame, scoreError, saving, restoreHistory } = useGame();
  const [selected, setSelected] = useState<number | null>(null);
  const appearance = useGameScreenAppearance();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const matches = !gameId || game?.id === gameId;
  const groups = matches ? groupHistory(events).slice(0, 6) : [];
  const point = selected !== null && game && matches ? getHistoryPoint({ game, events }, selected) : null;
  useFocusEffect(useCallback(() => { if (gameId) void openGame(gameId); }, [gameId, openGame]));
  const first = game?.players[0];
  const second = game?.players[1];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, { paddingTop: Math.max(66, insets.top + 4) }]}>
        <GameScreenHeader title="History" subtitle={game?.name ?? 'Your game'} backLabel="Game"
          onBack={() => router.canGoBack() ? router.back() : router.replace('/scoreboard')}
          fontsLoaded={appearance.fontsLoaded}
          trailing={[{ label: 'LIVE', accessibilityLabel: 'Game is live', onPress: () => router.back() }]}
        />
        <FlatList data={groups} keyExtractor={(group) => group[0].batchId}
          alwaysBounceVertical={false} bounces={false} overScrollMode="never"
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              {game && matches ? (
                <View style={styles.summary}>
                  <View>
                    <Text style={[styles.summaryTitle, appearance.fontsLoaded && gameFonts.display]}>ROUND 1 OF 1</Text>
                    <Text style={[styles.summarySub, appearance.fontsLoaded && gameFonts.bold]}>
                      In progress · {groups.length} {groups.length === 1 ? 'turn' : 'turns'}
                    </Text>
                  </View>
                  <View style={styles.scoreline}>
                    {first ? <View style={[styles.scoreBox, { backgroundColor: getPlayerColor(first.color).background }]}><Text style={[styles.score, appearance.fontsLoaded && gameFonts.display]}>{first.score}</Text></View> : null}
                    <Text style={[styles.dash, appearance.fontsLoaded && gameFonts.display]}>—</Text>
                    {second ? <View style={[styles.scoreBox, { backgroundColor: getPlayerColor(second.color).background }]}><Text style={[styles.score, appearance.fontsLoaded && gameFonts.display]}>{second.score}</Text></View> : null}
                  </View>
                </View>
              ) : null}
              <View style={styles.historyHeading}>
                <Text style={[styles.historyTitle, appearance.fontsLoaded && gameFonts.display]}>ROUND 1 · LIVE</Text>
                <Text style={[styles.restoreHint, appearance.fontsLoaded && gameFonts.bold]}>CLICK TO GO BACK</Text>
              </View>
              {scoreError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{scoreError}</Text> : null}
            </>
          }
          ListEmptyComponent={<View style={styles.empty}>
            <Text style={[styles.emptyText, appearance.fontsLoaded && gameFonts.regular]}>
              {loadingGame ? 'Loading history…' : game && matches ? 'No score changes yet.' : 'Open a saved game to see its history.'}
            </Text>
          </View>}
          renderItem={({ item: group, index }) => {
            const event = group[0];
            const player = game?.players.find((item) => item.id === event.playerId);
            return (
              <Pressable accessibilityRole="button"
                accessibilityLabel={`Restore scores after action #${event.id}`}
                accessibilityHint="Shows all target scores and asks for confirmation."
                disabled={saving || loadingGame} onPress={() => setSelected(event.id)}
                style={({ pressed }) => [styles.event, index % 2 === 0 && styles.eventRaised, pressed && styles.pressed]}>
                <View style={[styles.marker, { backgroundColor: player ? getPlayerColor(player.color).background : arcadeColors.yellow }]} />
                <View style={styles.turnMeta}>
                  <Text style={[styles.turnTitle, appearance.fontsLoaded && gameFonts.display]}>TURN {groups.length - index}</Text>
                  <Text style={[styles.timing, appearance.fontsLoaded && gameFonts.bold]}>{relativeTime(event.createdAt)}</Text>
                </View>
                <View style={styles.actionDetail}>
                  <Text numberOfLines={1} style={[styles.playerName, appearance.fontsLoaded && gameFonts.display]}>{event.playerName}</Text>
                  <Text numberOfLines={1} style={[styles.description, appearance.fontsLoaded && gameFonts.regular]}>{actionDescription(event)}</Text>
                </View>
                <View style={styles.change}>
                  <Text style={[styles.points, appearance.fontsLoaded && gameFonts.display, index === 0 && styles.latest]}>
                    {event.amount >= 0 ? '+' : ''}{event.amount}
                  </Text>
                  <Text style={[styles.scoreChange, appearance.fontsLoaded && gameFonts.bold]}>{event.previousScore} → {event.newScore}</Text>
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={groups.length ? (
            <View style={styles.previousRound}>
              <View>
                <Text style={[styles.previousTitle, appearance.fontsLoaded && gameFonts.display]}>ROUND 1 · COMPLETE</Text>
                <Text style={[styles.previousSub, appearance.fontsLoaded && gameFonts.bold]}>Saved score history · {groups.length} turns</Text>
              </View>
              <Text style={[styles.previousScore, appearance.fontsLoaded && gameFonts.display]}>
                {first?.score ?? 0}–{second?.score ?? 0} <Text style={styles.disclosure}>›</Text>
              </Text>
            </View>
          ) : null}
        />
        {point && game ? <ConfirmActionModal title="Restore scores to this point?"
          description={`Return every score to the end of action #${point.endpoint}. Later changes stay in the audit history.`}
          actionLabel="Restore" onConfirm={() => restoreHistory(point.endpoint)} onClose={() => setSelected(null)}>
          {game.players.map((player) => <Text key={player.id} style={styles.modalText}>{player.name}: {player.score} → {point.scores.get(player.id)}</Text>)}
        </ConfirmActionModal> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: arcadeColors.navy },
  content: { flexGrow: 1, width: '100%', maxWidth: 390, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  summary: { ...arcadeSurface, height: 66, backgroundColor: arcadeColors.white, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { color: arcadeColors.ink, fontSize: 12, lineHeight: 14, fontWeight: '900' },
  summarySub: { color: '#5A5D63', fontSize: 9, lineHeight: 12, fontWeight: '800' },
  scoreline: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scoreBox: { width: 43, height: 36, borderWidth: 3, borderColor: arcadeColors.ink, alignItems: 'center', justifyContent: 'center' },
  score: { color: arcadeColors.white, fontSize: 19, lineHeight: 22, fontWeight: '900' },
  dash: { color: arcadeColors.ink, fontSize: 13 },
  historyHeading: { height: 13, marginTop: 20, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTitle: { color: arcadeColors.white, fontSize: 12, lineHeight: 13, fontWeight: '900' },
  restoreHint: { color: arcadeColors.muted, fontSize: 9, lineHeight: 12, letterSpacing: 0.6, fontWeight: '800' },
  event: { height: 52, backgroundColor: arcadeColors.panel, borderBottomWidth: 2, borderColor: arcadeColors.ink, flexDirection: 'row', gap: 9, alignItems: 'center', paddingLeft: 8, paddingRight: 6, paddingVertical: 7 },
  eventRaised: { backgroundColor: arcadeColors.panelSoft },
  marker: { width: 6, height: 34 },
  turnMeta: { width: 49 },
  turnTitle: { color: arcadeColors.white, fontSize: 9, lineHeight: 11, fontWeight: '900' },
  timing: { color: arcadeColors.muted, fontSize: 7, lineHeight: 9, letterSpacing: 0.4, fontWeight: '800' },
  actionDetail: { flex: 1, minWidth: 0 },
  playerName: { color: arcadeColors.white, fontSize: 11, lineHeight: 13, fontWeight: '900' },
  description: { color: arcadeColors.muted, fontSize: 9, lineHeight: 11 },
  change: { width: 60, alignItems: 'flex-end' },
  points: { color: arcadeColors.white, fontSize: 16, lineHeight: 18, fontWeight: '900' },
  latest: { color: arcadeColors.yellow },
  scoreChange: { color: arcadeColors.muted, fontSize: 8, lineHeight: 10, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  previousRound: { ...arcadeSurface, height: 62, marginTop: 22, backgroundColor: arcadeColors.panelRaised, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previousTitle: { color: arcadeColors.white, fontSize: 11, lineHeight: 13, fontWeight: '900' },
  previousSub: { color: arcadeColors.muted, fontSize: 9, lineHeight: 11, fontWeight: '800' },
  previousScore: { color: arcadeColors.white, fontSize: 18, lineHeight: 20, fontWeight: '900' },
  disclosure: { color: arcadeColors.yellow },
  empty: { minHeight: 316, borderWidth: 4, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.panel, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: arcadeColors.muted, fontSize: 13, textAlign: 'center' },
  error: { color: arcadeColors.white, fontSize: 11, marginBottom: 8 },
  modalText: { color: arcadeColors.white, fontSize: 16, lineHeight: 24 },
});
