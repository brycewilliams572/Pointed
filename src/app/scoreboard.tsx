import { useCallback, useEffect, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Player } from '@/types/game';
import { UndoRedoControls } from '@/components/undo-redo-controls';
import { PlayerCard } from '@/components/player-card';
import { ScoreEntryModal } from '@/components/score-entry-modal';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';
import { getGridColumns } from '@/utils/scoreboard-layout';
import { GameScreenBackground, GameScreenHeader, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';

export default function ScoreboardScreen() {
  const { game: loadedGame, canUndo, canRedo, redo, changeScore, scoreError, layout, setLayout, openGame, loadingGame, saving, undo } = useGame();
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const game = !gameId || loadedGame?.id === gameId ? loadedGame : null;
  const theme = useTheme();
  const router = useRouter();
  const { fontScale, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const appearance = useGameScreenAppearance();
  const grid = layout === 'grid';
  const semibold = grid && appearance.fontsLoaded && gameFonts.semibold;
  const [contentWidth, setContentWidth] = useState(0);
  const [entry, setEntry] = useState<Player | null>(null);
  useFocusEffect(useCallback(() => { if (gameId) void openGame(gameId); }, [gameId, openGame]));
  useEffect(() => {
    if (scoreError) AccessibilityInfo.announceForAccessibility(scoreError);
  }, [scoreError]);
  const availableWidth = contentWidth || Math.min(1168, width - insets.left - insets.right - 32);
  const columns = layout === 'list' ? 1 : getGridColumns(availableWidth, game?.players.length ?? 1, fontScale);
  const cardWidth = (availableWidth - 12 * (columns - 1)) / columns;
  const modeControls = (
    <View style={[styles.controls, { backgroundColor: theme.backgroundElement }]}>
      {(['grid', 'list'] as const).map((mode) => (
        <Pressable key={mode} accessibilityRole="button"
          accessibilityLabel={`${mode === 'grid' ? 'Grid' : 'List'} view`}
          accessibilityState={{ selected: layout === mode }} onPress={() => setLayout(mode)}
          style={({ pressed }) => [styles.modeButton, grid && styles.gridModeButton,
            { backgroundColor: layout === mode ? theme.text : theme.backgroundElement }, pressed && styles.pressed]}>
          <Text style={[styles.label, semibold, grid && styles.gridLabel, { color: layout === mode ? (grid ? appearance.background : theme.background) : theme.text }]}>
            {mode === 'grid' ? 'Grid' : 'List'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: grid ? appearance.background : theme.background }]}>
      {grid ? <GameScreenBackground /> : null}
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, grid && { paddingTop: Math.max(47, insets.top) }]}>
      <Stack.Screen options={{ headerShown: !grid, headerRight: () => (
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={styles.modeButton}>
          <Text style={[styles.label, { color: theme.text }]}>Settings</Text>
        </Pressable>
      ) }} />
      {grid ? <GameScreenHeader title="Scoreboard" settings fontsLoaded={appearance.fontsLoaded} /> : null}
      {game ? (
        <View style={[styles.toolbar, { backgroundColor: grid ? 'transparent' : theme.background }]}>
          <Text accessibilityRole="header" numberOfLines={grid ? 1 : undefined} style={[styles.title, grid && styles.gridTitle, grid && appearance.fontsLoaded && gameFonts.bold, { color: theme.text }]}>
            {game.name ?? 'Your game'}
          </Text>
          <View style={[styles.actionRow, grid && styles.gridActionRow]}>
            <UndoRedoControls grid={grid} canUndo={canUndo} canRedo={canRedo} busy={saving || loadingGame} undo={undo} redo={redo} />
            {grid ? modeControls : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Score History" onPress={() => router.push({ pathname: '/history', params: { gameId: game.id } })} style={[styles.modeButton, grid && styles.gridHistory, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.label, semibold, grid && styles.gridLabel, { color: theme.text }]}>History</Text>
            </Pressable>
          </View>
          {!grid ? modeControls : null}
          <Text numberOfLines={1} accessibilityLiveRegion="polite" style={[styles.status, grid && appearance.fontsLoaded && gameFonts.regular, { color: theme.textSecondary }]}>{saving ? 'Saving...' : loadingGame ? 'Loading...' : 'Tap a player to score'}</Text>
          {scoreError ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.text }]}>{scoreError}</Text> : null}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.list} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
          {game ? (
            <View style={styles.cards}>
              {game.players.map((player) => (
                <View key={player.id} style={{ width: cardWidth ?? '100%' }}>
                  <PlayerCard player={player} layout={layout} onPress={setEntry} disabled={saving || loadingGame} fontsLoaded={grid && appearance.fontsLoaded} />
                </View>
              ))}
            </View>
          ) : (
            <>
              <Text style={[styles.message, { color: theme.text }]}>
                {loadingGame ? 'Loading game...' : scoreError ?? 'Choose a saved game from Home or create a new game.'}
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
      {entry && game?.players.some((player) => player.id === entry.id) ? (
        <ScoreEntryModal key={entry.id} player={entry} onSubmit={changeScore} submitError={scoreError} onClose={() => setEntry(null)} />
      ) : null}
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { width: '100%', maxWidth: 1200, alignSelf: 'center', padding: 16, gap: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  status: { fontSize: 14, lineHeight: 20, minHeight: 20 },
  controls: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, padding: 4, borderRadius: 16 },
  content: { padding: 16, paddingTop: 0 },
  list: { width: '100%', maxWidth: 1168, alignSelf: 'center', gap: 16 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  title: { fontSize: 28, fontWeight: '700' },
  gridTitle: { lineHeight: 34 },
  gridActionRow: { justifyContent: 'center', gap: 10, marginHorizontal: -1.5, minHeight: 48 },
  gridModeButton: { width: 64, paddingHorizontal: 0 },
  gridHistory: { minWidth: 102 },
  gridLabel: { lineHeight: 22 },
  message: { fontSize: 18, lineHeight: 28 },
  button: { minHeight: 56, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modeButton: { minHeight: 48, minWidth: 64, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
