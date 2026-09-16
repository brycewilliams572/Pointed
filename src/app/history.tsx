import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmActionModal } from '@/components/confirm-action-modal';
import { UndoRedoControls } from '@/components/undo-redo-controls';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';
import { getHistoryPoint, groupHistory } from '@/services/history';
import type { ScoreEvent } from '@/types/history';

function label(event: ScoreEvent) {
  switch (event.type) {
    case 'SET_SCORE': return 'Set Score';
    case 'UNDO': return 'Undo';
    case 'REDO': return 'Redo';
    case 'RESTORE': return 'Restore scores';
    default: return event.amount >= 0 ? `+${event.amount}` : String(event.amount);
  }
}

export default function HistoryScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { game, events, openGame, loadingGame, scoreError, saving, undo, redo, canUndo, canRedo, restoreHistory } = useGame();
  const [selected, setSelected] = useState<number | null>(null);
  const theme = useTheme();
  const router = useRouter();
  const matches = !gameId || game?.id === gameId;
  const point = selected !== null && game && matches ? getHistoryPoint({ game, events }, selected) : null;
  useFocusEffect(useCallback(() => { if (gameId) void openGame(gameId); }, [gameId, openGame]));

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <FlatList data={matches ? groupHistory(events) : []} keyExtractor={(group) => group[0].batchId} contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{matches ? game?.name ?? 'Score History' : 'Score History'}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>Newest first. Restore a point to return every player&apos;s score to the end of that action. The audit history is kept.</Text>
            {scoreError ? <Text accessibilityLiveRegion="polite" style={[styles.text, { color: theme.text }]}>{scoreError}</Text> : null}
            <UndoRedoControls canUndo={matches && canUndo} canRedo={matches && canRedo} busy={saving || loadingGame} undo={undo} redo={redo} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.heading}>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{loadingGame ? 'Loading history...' : game && matches ? 'No score changes yet.' : 'Open a saved game to see its score history.'}</Text>
            {scoreError && gameId ? <Pressable accessibilityRole="button" accessibilityLabel="Retry loading history" onPress={() => void openGame(gameId)} style={styles.button}><Text style={[styles.text, { color: theme.text }]}>Try again</Text></Pressable> : null}
            {!game && !loadingGame ? <Pressable accessibilityRole="button" accessibilityLabel="Saved Games" onPress={() => router.navigate('/games')} style={styles.button}><Text style={[styles.text, { color: theme.text }]}>Saved Games</Text></Pressable> : null}
          </View>
        }
        renderItem={({ item: group }) => {
          const first = group[0];
          return (
            <View style={[styles.event, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.name, { color: theme.text }]}>#{first.id} · {label(first)}</Text>
              <Text style={[styles.text, { color: theme.textSecondary }]}>{new Date(first.createdAt).toLocaleString()}</Text>
              {group.map((item) => <View key={item.id} style={styles.change}>
                <Text style={[styles.name, { color: theme.text }]}>{item.playerName}: {item.previousScore} → {item.newScore}</Text>
                {item.type === 'SUBTRACT_SCORE' && item.requestedAmount !== item.amount ? <Text style={[styles.text, { color: theme.textSecondary }]}>Requested {item.requestedAmount}; stopped at 0.</Text> : null}
              </View>)}
              {first.restoreTarget !== null ? <Text style={[styles.text, { color: theme.textSecondary }]}>Restored the state after #{first.restoreTarget}.</Text> : null}
              {first.actionState === 'undone' ? <Text style={[styles.text, { color: theme.textSecondary }]}>Undone · available to Redo</Text> : null}
              {first.actionState === 'abandoned' ? <Text style={[styles.text, { color: theme.textSecondary }]}>Reverted on an earlier branch · kept in history</Text> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={`Restore scores after action #${first.id}`}
                accessibilityHint="Shows all target scores and asks for confirmation." disabled={saving || loadingGame}
                accessibilityState={{ disabled: saving || loadingGame }} onPress={() => setSelected(first.id)}
                style={[styles.button, { borderWidth: 1, borderColor: theme.textSecondary }]}>
                <Text style={[styles.text, { color: theme.text }]}>Restore to this point</Text>
              </Pressable>
            </View>
          );
        }}
      />
      {point && game ? <ConfirmActionModal title="Restore scores to this point?"
        description={`Restore the scores after action #${point.endpoint}. Later score changes will be reverted; the full history is kept. If scores change, Redo is cleared and you can Undo this restore.`}
        actionLabel="Restore" onConfirm={() => restoreHistory(point.endpoint)} onClose={() => setSelected(null)}>
        {game.players.map((player) => <Text key={player.id} style={[styles.text, { color: theme.text }]}>{player.name}: {player.score} → {point.scores.get(player.id)}</Text>)}
      </ConfirmActionModal> : null}
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
  event: { borderRadius: 16, padding: 16, gap: 12 },
  change: { gap: 4 },
  button: { minHeight: 48, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
