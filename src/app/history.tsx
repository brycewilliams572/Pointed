import { useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';

export default function HistoryScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { game, events, openGame, loadingGame, scoreError, saving, undo } = useGame();
  const theme = useTheme();
  const router = useRouter();
  const matches = !gameId || game?.id === gameId;
  const canUndo = matches && events.some((event) => event.type !== 'UNDO' && event.undoneAt === null);
  useFocusEffect(useCallback(() => { if (gameId) void openGame(gameId); }, [gameId, openGame]));

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <FlatList
        data={matches ? events : []}
        keyExtractor={(event) => String(event.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{matches ? game?.name ?? 'Score History' : 'Score History'}</Text>
            {scoreError ? <Text accessibilityLiveRegion="polite" style={[styles.text, { color: theme.text }]}>{scoreError}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Undo latest score change" accessibilityState={{ disabled: !canUndo || saving }} disabled={!canUndo || saving} onPress={() => void undo()} style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.text, { color: canUndo && !saving ? theme.text : theme.textSecondary }]}>{saving ? 'Saving…' : 'Undo latest change'}</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.heading}>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{loadingGame ? 'Loading history…' : game && matches ? 'No score changes yet.' : 'Open a saved game from Home to see its history.'}</Text>
            {scoreError && gameId ? <Pressable accessibilityRole="button" accessibilityLabel="Retry loading history" onPress={() => void openGame(gameId)} style={styles.button}><Text style={[styles.text, { color: theme.text }]}>Try again</Text></Pressable> : null}
            {!game && !loadingGame ? <Pressable accessibilityRole="button" accessibilityLabel="Home" onPress={() => router.navigate('/')} style={styles.button}><Text style={[styles.text, { color: theme.text }]}>Home</Text></Pressable> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.event, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.name, { color: theme.text }]}>{item.playerName}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={[styles.name, { color: theme.text }]}>
              {item.type === 'SET_SCORE' ? 'Set Score' : item.type === 'UNDO' ? 'Undo' : item.amount >= 0 ? `+${item.amount}` : String(item.amount)}
            </Text>
            <Text style={[styles.text, { color: theme.text }]}>{item.previousScore} → {item.newScore}</Text>
            {item.type === 'SUBTRACT_SCORE' && item.requestedAmount !== item.amount ? <Text style={[styles.text, { color: theme.textSecondary }]}>Requested {item.requestedAmount}; stopped at 0.</Text> : null}
            {item.undoneAt !== null ? <Text style={[styles.text, { color: theme.textSecondary }]}>Undone {new Date(item.undoneAt).toLocaleString()}</Text> : null}
            {item.undoOf !== null ? <Text style={[styles.text, { color: theme.textSecondary }]}>Reverses change #{item.undoOf}</Text> : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 12, width: '100%', maxWidth: 700, alignSelf: 'center' },
  heading: { gap: 12, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '600' },
  text: { fontSize: 16, lineHeight: 24 },
  event: { borderRadius: 16, padding: 16, gap: 8 },
  button: { minHeight: 48, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
