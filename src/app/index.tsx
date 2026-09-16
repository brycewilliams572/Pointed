import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useGame } from '@/context/game-context';

export default function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { activeGames, gamesLoading, gamesError, refreshGames } = useGame();
  useFocusEffect(useCallback(() => { void refreshGames(); }, [refreshGames]));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityHint="Opens the Settings screen."
          onPress={() => router.navigate('/settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Settings</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.home}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
              Pointed
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Keep score for anything.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New Game"
            accessibilityHint="Opens the New Game screen."
            onPress={() => router.navigate('/new-game')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.text },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.buttonLabel, { color: colors.background }]}>New Game</Text>
          </Pressable>

          <View style={[styles.continueSection, { backgroundColor: colors.backgroundElement }]}>
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: colors.text }]}>
              Continue Game
            </Text>
            {gamesLoading ? <Text accessibilityLiveRegion="polite" style={[styles.placeholder, { color: colors.textSecondary }]}>Loading saved games…</Text> : null}
            {gamesError ? (
              <>
                <Text accessibilityLiveRegion="polite" style={[styles.placeholder, { color: colors.text }]}>{gamesError}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Retry loading saved games" onPress={() => void refreshGames()} style={styles.settingsButton}>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>Try again</Text>
                </Pressable>
              </>
            ) : null}
            {!gamesLoading && !gamesError && activeGames.length === 0 ? <Text style={[styles.placeholder, { color: colors.textSecondary }]}>No active games</Text> : null}
            {activeGames.map((game) => (
              <Pressable key={game.id} accessibilityRole="button" accessibilityLabel={`Continue ${game.name ?? 'Untitled game'}, ${game.playerCount} players`} onPress={() => router.push({ pathname: '/scoreboard', params: { gameId: game.id } })} style={({ pressed }) => [styles.savedGame, { backgroundColor: colors.background }, pressed && styles.pressed]}>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>{game.name ?? 'Untitled game'}</Text>
                <Text style={[styles.placeholder, { color: colors.textSecondary }]}>{game.playerCount} players · Last played {new Date(game.updatedAt).toLocaleString()}</Text>
                <Text style={[styles.settingsLabel, { color: colors.text }]}>Continue Game</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  savedGame: { minHeight: 48, padding: 16, borderRadius: 12, gap: 8 },
  screen: {
    flex: 1,
  },
  toolbar: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  settingsButton: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  home: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 16,
  },
  heading: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  continueSection: {
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    fontSize: 15,
    textAlign: 'center',
  },
});
