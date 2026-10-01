import { useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerEditor } from '@/components/player-editor';
import { PLAYER_COLORS } from '@/constants/player-colors';
import { useGame } from '@/context/game-context';
import { GameScreenBackground, GameScreenHeader, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
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
  const theme = useGameScreenAppearance();
  const insets = useSafeAreaInsets();
  const semibold = theme.fontsLoaded && gameFonts.semibold;
  const router = useRouter();
  const { createGame, saving, scoreError } = useGame();
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<Player[]>(() => [createPlayer(1), createPlayer(2)]);
  const nextPlayer = useRef(3);
  const starting = useRef(false);

  function addPlayer() {
    if (players.length >= MAX_PLAYERS) return;
    const player = createPlayer(nextPlayer.current++);
    setPlayers((current) => current.length < MAX_PLAYERS ? [...current, player] : current);
  }

  async function startGame() {
    if (starting.current || players.length < 1 || players.length > MAX_PLAYERS) return;
    starting.current = true;
    const id = await createGame({
      name: name.trim() || undefined,
      players: players.map((player, displayOrder) => ({
        ...player, name: player.name.trim() || `Player ${displayOrder + 1}`, score: 0, displayOrder,
      })),
    });
    starting.current = false;
    if (!id) return;
    Keyboard.dismiss();
    router.replace({ pathname: '/scoreboard', params: { gameId: id } });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <GameScreenBackground />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, { paddingTop: Math.max(47, insets.top) }]}>
      <GameScreenHeader title="New Game" fontsLoaded={theme.fontsLoaded} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarRow}>
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" accessibilityLabel={`${players.length} of ${MAX_PLAYERS} players`} style={[styles.label, semibold, { color: theme.text }]}>
              {players.length} / {MAX_PLAYERS} players
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Player"
              accessibilityState={{ disabled: players.length >= MAX_PLAYERS }}
              disabled={players.length >= MAX_PLAYERS}
              onPress={addPlayer}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.buttonBackground, opacity: players.length >= MAX_PLAYERS ? 0.4 : 1 },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.label, semibold, { color: theme.buttonText }]}>Add Player</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView
          alwaysBounceVertical={false}
          bounces={false}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          style={styles.scroll}
          contentContainerStyle={styles.content}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, semibold, { color: theme.text }]}>Game name (optional)</Text>
              <TextInput
                accessibilityLabel="Game name (optional)"
                value={name}
                onChangeText={setName}
                placeholder="Game Name"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  theme.fontsLoaded && gameFonts.regular,
                  { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>
            {players.length === MAX_PLAYERS ? (
              <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textSecondary }]}>
                Maximum of 16 players reached. Remove a player to add another.
              </Text>
            ) : null}
            {players.map((player, index) => (
              <PlayerEditor
                key={player.id}
                player={player}
                index={index}
                canRemove={players.length > 1}
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
              accessibilityLabel="Start Game"
              accessibilityState={{ disabled: saving, busy: saving }}
              disabled={saving}
              onPress={startGame}
              style={({ pressed }) => [styles.button, { backgroundColor: theme.buttonBackground }, pressed && styles.pressed]}>
              <Text style={[styles.label, semibold, { color: theme.buttonText }]}>{saving ? 'Saving game…' : 'Start Game'}</Text>
            </Pressable>
            {scoreError ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.text }]}>{scoreError}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  toolbar: { width: '100%', maxWidth: 390, minHeight: 80, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  toolbarRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 24 },
  form: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 16 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 18, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 18, lineHeight: 22, fontWeight: '600' },
  message: { fontSize: 16, lineHeight: 24 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, lineHeight: 22 },
  addButton: { minWidth: 129, minHeight: 56, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 9, boxShadow: '5px 5px 0px #51756E', alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 56, borderRadius: 9, padding: 16, boxShadow: '5px 5px 0px #51756E', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
