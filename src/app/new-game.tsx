import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerEditor } from '@/components/player-editor';
import { PLAYER_COLORS } from '@/constants/player-colors';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';
import type { Player } from '@/types/game';

const MAX_PLAYERS = 16;

function createPlayer(number: number): Player {
  return {
    id: `player-${number}`,
    name: '',
    color: PLAYER_COLORS[(number - 1) % PLAYER_COLORS.length].background,
    score: 0,
    displayOrder: number - 1,
  };
}

export default function NewGameScreen() {
  const theme = useTheme();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { setGame } = useGame();
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<Player[]>(() => [createPlayer(1), createPlayer(2)]);
  const [submitted, setSubmitted] = useState(false);
  const nextPlayer = useRef(3);
  const errors = players.map((player, index) =>
    player.name.trim() ? undefined : `Enter a name for Player ${index + 1}.`
  );

  function addPlayer() {
    if (players.length >= MAX_PLAYERS) return;
    const player = createPlayer(nextPlayer.current++);
    setPlayers((current) => current.length < MAX_PLAYERS ? [...current, player] : current);
  }

  function startGame() {
    setSubmitted(true);
    const messages = errors.filter(Boolean);
    if (messages.length) {
      AccessibilityInfo.announceForAccessibility(messages.join(' '));
      return;
    }
    if (players.length < 1 || players.length > MAX_PLAYERS) return;
    setGame({
      id: `game-${Date.now()}`,
      name: name.trim() || undefined,
      players: players.map((player, displayOrder) => ({
        ...player, name: player.name.trim(), score: 0, displayOrder,
      })),
    });
    Keyboard.dismiss();
    router.push('/scoreboard');
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.form}>
            <Text nativeID="game-name-label" style={[styles.label, { color: theme.text }]}>
              Game name (optional)
            </Text>
            <TextInput
              accessibilityLabel="Game name (optional)"
              accessibilityLabelledBy="game-name-label"
              value={name}
              onChangeText={setName}
              placeholder="Game night"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.background }]}
            />
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[styles.label, { color: theme.text }]}>
              {players.length} / {MAX_PLAYERS} players
            </Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              Add 1–16 players. Every player needs a name.
            </Text>
            {players.map((player, index) => (
              <PlayerEditor
                key={player.id}
                player={player}
                index={index}
                canRemove={players.length > 1}
                error={submitted ? errors[index] : undefined}
                onChange={(changes) => setPlayers((current) => current.map((item) =>
                  item.id === player.id ? { ...item, ...changes } : item
                ))}
                onRemove={() => setPlayers((current) =>
                  current.length > 1 ? current.filter((item) => item.id !== player.id) : current
                )}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Player"
              accessibilityState={{ disabled: players.length >= MAX_PLAYERS }}
              disabled={players.length >= MAX_PLAYERS}
              onPress={addPlayer}
              style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
              <Text style={[styles.label, { color: players.length >= MAX_PLAYERS ? theme.textSecondary : theme.text }]}>
                Add Player
              </Text>
            </Pressable>
            {players.length === MAX_PLAYERS ? (
              <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textSecondary }]}>
                Maximum of 16 players reached. Remove a player to add another.
              </Text>
            ) : null}
            {submitted && errors.some(Boolean) ? (
              <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.text }]}>
                {errors.filter(Boolean).join('\n')}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start Game"
              onPress={startGame}
              style={({ pressed }) => [styles.button, { backgroundColor: theme.text }, pressed && styles.pressed]}>
              <Text style={[styles.label, { color: theme.background }]}>Start Game</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24 },
  form: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 16 },
  label: { fontSize: 18, fontWeight: '600' },
  message: { fontSize: 16, lineHeight: 24 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 18 },
  button: { minHeight: 56, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
