import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerCard } from '@/components/player-card';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';

export default function ScoreboardScreen() {
  const { game } = useGame();
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.list}>
          {game ? (
            <>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
                {game.name ?? 'Your game'}
              </Text>
              {game.players.map((player) => <PlayerCard key={player.id} player={player} />)}
            </>
          ) : (
            <>
              <Text style={[styles.message, { color: theme.text }]}>
                No game is available. Create a new game to see the scoreboard. Games are cleared when the app reloads.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New Game"
                onPress={() => router.replace('/new-game')}
                style={({ pressed }) => [styles.button, { backgroundColor: theme.text }, pressed && { opacity: 0.75 }]}>
                <Text style={[styles.label, { color: theme.background }]}>New Game</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24 },
  list: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  message: { fontSize: 18, lineHeight: 28 },
  button: { minHeight: 56, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '600' },
});
