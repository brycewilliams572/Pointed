import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmActionModal } from '@/components/confirm-action-modal';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';
import type { GameSummary } from '@/types/history';

export default function GamesScreen() {
  const { activeGames, gamesLoading, gamesError, refreshGames, deleteGame, saving } = useGame();
  const [selected, setSelected] = useState<GameSummary | null>(null);
  const theme = useTheme();
  const router = useRouter();
  useFocusEffect(useCallback(() => { void refreshGames(); }, [refreshGames]));
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <FlatList data={activeGames} keyExtractor={(game) => game.id} contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Saved Games</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Choose a game to resume its scoreboard.</Text>
          {gamesLoading ? <Text accessibilityLiveRegion="polite" style={[styles.text, { color: theme.textSecondary }]}>Loading saved games...</Text> : null}
          {gamesError ? <><Text accessibilityLiveRegion="polite" style={[styles.text, { color: theme.text }]}>{gamesError}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry loading saved games" onPress={() => void refreshGames()} style={styles.button}><Text style={[styles.text, { color: theme.text }]}>Try again</Text></Pressable></> : null}
        </View>}
        ListEmptyComponent={!gamesLoading && !gamesError ? <Text style={[styles.text, { color: theme.textSecondary }]}>No saved games yet. Create a New Game from Home.</Text> : null}
        renderItem={({ item }) => <View style={[styles.game, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.title, { color: theme.text }]}>{item.name ?? 'Untitled game'}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{item.playerCount} players · {item.status === 'active' ? 'Active' : 'Completed'}</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>Last played {new Date(item.updatedAt).toLocaleString()}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Continue ${item.name ?? 'Untitled game'}`} disabled={saving} accessibilityState={{ disabled: saving }}
            onPress={() => router.push({ pathname: '/scoreboard', params: { gameId: item.id } })} style={[styles.button, { backgroundColor: theme.text }]}>
            <Text style={[styles.text, { color: theme.background }]}>Continue Game</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.name ?? 'Untitled game'}`} accessibilityHint="Asks for confirmation before permanently deleting this game."
            disabled={saving} accessibilityState={{ disabled: saving }} onPress={() => setSelected(item)} style={[styles.button, styles.delete]}>
            <Text style={[styles.text, { color: '#FFFFFF' }]}>Delete Game</Text>
          </Pressable>
        </View>} />
      {selected ? <ConfirmActionModal title={`Delete "${selected.name ?? 'Untitled game'}"?`}
        description="This will permanently delete the game, its players, scores, and score history."
        actionLabel="Delete" onConfirm={() => deleteGame(selected.id)} onClose={() => setSelected(null)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 16, width: '100%', maxWidth: 700, alignSelf: 'center' },
  heading: { gap: 12 },
  game: { borderRadius: 16, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  text: { fontSize: 16, lineHeight: 24 },
  button: { minHeight: 48, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  delete: { backgroundColor: '#B91C1C' },
});
