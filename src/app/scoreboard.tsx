import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerCard } from '@/components/player-card';
import { ScoreEntryModal } from '@/components/score-entry-modal';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';
import { getGridColumns } from '@/utils/scoreboard-layout';

export default function ScoreboardScreen() {
  const { game: loadedGame, events, changeScore, scoreError, layout, setLayout, openGame, loadingGame, saving, undo } = useGame();
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const game = !gameId || loadedGame?.id === gameId ? loadedGame : null;
  const canUndo = events.some((event) => event.type !== 'UNDO' && event.undoneAt === null);
  const theme = useTheme();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const [entry, setEntry] = useState<{ playerId: string; method: 'manual' | 'set' } | null>(null);
  const entryPlayer = game?.players.find((player) => player.id === entry?.playerId);
  useEffect(() => { if (gameId) void openGame(gameId); }, [gameId, openGame]);
  useEffect(() => {
    if (scoreError) AccessibilityInfo.announceForAccessibility(scoreError);
  }, [scoreError]);
  const columns = layout === 'list' ? 1 : getGridColumns(contentWidth, game?.players.length ?? 1, fontScale);
  const cardWidth = contentWidth > 0 ? (contentWidth - 12 * (columns - 1)) / columns : undefined;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <Stack.Screen options={{ headerRight: () => (
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={styles.modeButton}>
          <Text style={[styles.label, { color: theme.text }]}>Settings</Text>
        </Pressable>
      ) }} />
      {game ? (
        <View style={[styles.toolbar, { backgroundColor: theme.background }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            {game.name ?? 'Your game'}
          </Text>
          <View style={styles.controls}>
            <Text style={[styles.message, { color: theme.textSecondary }]}>{game.players.length} players</Text>
            {(['grid', 'list'] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={`${mode === 'grid' ? 'Grid' : 'List'} view`}
                accessibilityState={{ selected: layout === mode }}
                onPress={() => setLayout(mode)}
                style={({ pressed }) => [
                  styles.modeButton,
                  { backgroundColor: layout === mode ? theme.text : theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.label, { color: layout === mode ? theme.background : theme.text }]}>
                  {mode === 'grid' ? 'Grid' : 'List'}
                </Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Score History" onPress={() => router.push({ pathname: '/history', params: { gameId: game.id } })} style={[styles.modeButton, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.label, { color: theme.text }]}>History</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Undo latest score change" accessibilityState={{ disabled: !canUndo || saving }} disabled={!canUndo || saving} onPress={() => void undo()} style={[styles.modeButton, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.label, { color: canUndo && !saving ? theme.text : theme.textSecondary }]}>Undo</Text>
            </Pressable>
          </View>
          {saving ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textSecondary }]}>Saving…</Text> : null}
          {scoreError ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.text }]}>{scoreError}</Text> : null}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.list} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
          {game ? (
            <View style={styles.cards}>
              {game.players.map((player) => (
                <View key={player.id} style={{ width: cardWidth ?? '100%' }}>
                  <PlayerCard player={player} layout={layout} onScoreChange={changeScore} onScoreEntry={(playerId, method) => setEntry({ playerId, method })} />
                </View>
              ))}
            </View>
          ) : (
            <>
              <Text style={[styles.message, { color: theme.text }]}>
                {loadingGame ? 'Loading game…' : scoreError ?? 'Choose a saved game from Home or create a new game.'}
              </Text>
              {!loadingGame && gameId ? <Pressable accessibilityRole="button" accessibilityLabel="Retry loading game" onPress={() => void openGame(gameId)} style={styles.button}><Text style={[styles.label, { color: theme.text }]}>Try again</Text></Pressable> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Home"
                onPress={() => router.navigate('/')}
                style={({ pressed }) => [styles.button, { backgroundColor: theme.text }, pressed && styles.pressed]}>
                <Text style={[styles.label, { color: theme.background }]}>Home</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
      {entry && entryPlayer ? (
        <ScoreEntryModal key={`${entryPlayer.id}-${entry.method}`} player={entryPlayer} method={entry.method} onSubmit={changeScore} onClose={() => setEntry(null)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { width: '100%', maxWidth: 1200, alignSelf: 'center', padding: 16, gap: 12 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  content: { padding: 16, paddingTop: 0 },
  list: { width: '100%', maxWidth: 1168, alignSelf: 'center', gap: 16 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  title: { fontSize: 28, fontWeight: '700' },
  message: { fontSize: 18, lineHeight: 28 },
  button: { minHeight: 56, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modeButton: { minHeight: 48, minWidth: 64, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
