import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { arcadeColors, arcadeSurface, GameScreenHeader, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
import { PlayerEditor } from '@/components/player-editor';
import { PLAYER_COLORS } from '@/constants/player-colors';
import { useGame } from '@/context/game-context';
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
  const router = useRouter();
  const { rematch, gameId } = useLocalSearchParams<{ rematch?: string; gameId?: string }>();
  const { game, createGame, openGame, saving, scoreError } = useGame();
  const isRematch = rematch === '1' && !!game;
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<Player[]>(() => [createPlayer(1), createPlayer(2)]);
  const seeded = useRef(false);
  const nextPlayer = useRef(3);
  const starting = useRef(false);

  useFocusEffect(useCallback(() => {
    if (rematch === '1' && gameId && game?.id !== gameId) void openGame(gameId);
  }, [game?.id, gameId, openGame, rematch]));

  useEffect(() => {
    if (!isRematch || !game || seeded.current) return;
    seeded.current = true;
    setName(game.name ?? '');
    setPlayers(game.players.map((player, displayOrder) => ({
      ...player,
      id: `rematch-${displayOrder}`,
      score: 0,
      displayOrder,
    })));
    nextPlayer.current = game.players.length + 1;
  }, [game, isRematch]);

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
        ...player,
        name: player.name.trim() || `Player ${displayOrder + 1}`,
        score: 0,
        displayOrder,
      })),
    });
    starting.current = false;
    if (!id) return;
    Keyboard.dismiss();
    router.replace({ pathname: '/scoreboard', params: { gameId: id } });
  }

  const summary = game?.players.map((player) => player.score).join('–') ?? '0–0';
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, { paddingTop: Math.max(66, insets.top + 4) }]}>
        <GameScreenHeader title={isRematch ? 'Rematch' : 'Scoreboard'} backLabel={isRematch ? 'Results' : 'Back'}
          fontsLoaded={theme.fontsLoaded}
          trailing={isRematch ? [{
            accessibilityLabel: 'More rematch options',
            icon: require('../../assets/images/figma-game/more.svg'),
            onPress: () => router.push('/game-settings' as Href),
          }] : undefined}
        />
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {!isRematch ? (
            <View style={styles.fixedSetup}>
              <TextInput accessibilityLabel="Game name (optional)" value={name} onChangeText={setName}
                placeholder="Game Name" placeholderTextColor={arcadeColors.navy}
                style={[styles.gameName, theme.fontsLoaded && gameFonts.display]} />
              <View style={styles.playerToolbar}>
                <Text accessibilityRole="header" accessibilityLiveRegion="polite"
                  accessibilityLabel={`${players.length} of ${MAX_PLAYERS} players`}
                  style={[styles.playerCount, theme.fontsLoaded && gameFonts.display]}>
                  {players.length} {players.length === 1 ? 'Player' : 'Players'}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Add Player"
                  accessibilityState={{ disabled: players.length >= MAX_PLAYERS }}
                  disabled={players.length >= MAX_PLAYERS} onPress={addPlayer}
                  style={({ pressed }) => [styles.addButton, { opacity: players.length >= MAX_PLAYERS ? 0.42 : pressed ? 0.72 : 1 }]}>
                  <Text style={[styles.addLabel, theme.fontsLoaded && gameFonts.display]}>Add Player</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          <ScrollView alwaysBounceVertical={false} bounces={false}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled" overScrollMode="never" style={styles.scroll}
            contentContainerStyle={styles.content}>
            <View style={styles.form}>
              {isRematch ? (
                <>
                  <View style={styles.previous}>
                    <Text numberOfLines={1} style={[styles.previousTitle, theme.fontsLoaded && gameFonts.display]}>{name || 'Game Name'}</Text>
                    <View style={styles.previousMeta}>
                      <Text style={[styles.previousMetaText, theme.fontsLoaded && gameFonts.bold]}>PREVIOUS · {summary}</Text>
                      <Text style={[styles.previousMetaText, theme.fontsLoaded && gameFonts.bold]}>SCORES RESET</Text>
                    </View>
                  </View>
                  <Text style={[styles.playersHeading, theme.fontsLoaded && gameFonts.display]}>Same players</Text>
                </>
              ) : null}
              {players.map((player, index) => (
                <PlayerEditor key={player.id} player={player} index={index} canRemove={players.length > 1}
                  onChange={(changes) => setPlayers((current) => current.map((item) => item.id === player.id ? { ...item, ...changes } : item))}
                  onRemove={() => setPlayers((current) => current.length > 1 ? current.filter((item) => item.id !== player.id) : current)}
                />
              ))}
              <View style={styles.flexSpacer} />
              {players.length === MAX_PLAYERS ? <Text accessibilityLiveRegion="polite" style={styles.message}>Maximum of 16 players reached.</Text> : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Edit game settings" onPress={() => router.push('/game-settings' as Href)}
                style={({ pressed }) => [styles.adjustments, pressed && styles.pressed]}>
                <View>
                  <Text style={[styles.adjustmentLabel, theme.fontsLoaded && gameFonts.bold]}>GAME SETTINGS</Text>
                  <Text style={[styles.adjustmentValue, theme.fontsLoaded && gameFonts.display]}>No score limit · Standard</Text>
                </View>
                <View style={styles.editRow}>
                  <Text style={[styles.edit, theme.fontsLoaded && gameFonts.display]}>Edit</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Start Game" accessibilityState={{ disabled: saving, busy: saving }}
                disabled={saving} onPress={startGame} style={({ pressed }) => [styles.start, pressed && styles.pressed]}>
                <Text style={[styles.startLabel, theme.fontsLoaded && gameFonts.display]}>{saving ? 'Saving game…' : 'Start Game'}</Text>
              </Pressable>
              {scoreError ? <Text accessibilityLiveRegion="polite" style={styles.message}>{scoreError}</Text> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: arcadeColors.navy },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingTop: 14, paddingHorizontal: 24, paddingBottom: 24 },
  fixedSetup: { width: '100%', maxWidth: 390, alignSelf: 'center', paddingHorizontal: 24, marginTop: 14, gap: 14 },
  form: { width: '100%', maxWidth: 342, flexGrow: 1, alignSelf: 'center', gap: 14 },
  gameName: { width: '100%', height: 44, borderWidth: 4, borderColor: arcadeColors.ink, borderRadius: 0, boxShadow: '5px 5px 0px #000000', backgroundColor: arcadeColors.white, color: arcadeColors.navy, paddingHorizontal: 12, paddingVertical: 6, fontSize: 18, lineHeight: 22, fontWeight: '900' },
  playerToolbar: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerCount: { color: arcadeColors.white, fontSize: 18, lineHeight: 22, fontWeight: '900' },
  addButton: { height: 36, minWidth: 129, paddingHorizontal: 12, backgroundColor: arcadeColors.yellow, borderWidth: 4, borderColor: arcadeColors.ink, boxShadow: '5px 5px 0px #000000', alignItems: 'center', justifyContent: 'center' },
  addLabel: { color: arcadeColors.ink, fontSize: 18, lineHeight: 20, fontWeight: '900' },
  previous: { ...arcadeSurface, height: 57, backgroundColor: arcadeColors.white, paddingHorizontal: 8, paddingVertical: 5, gap: 1 },
  previousTitle: { color: arcadeColors.navy, fontSize: 16, lineHeight: 20, fontWeight: '900' },
  previousMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previousMetaText: { color: arcadeColors.navy, fontSize: 11, lineHeight: 13, fontWeight: '700' },
  playersHeading: { color: arcadeColors.white, fontSize: 15, lineHeight: 16, fontWeight: '900', marginTop: -1, marginBottom: -3 },
  flexSpacer: { height: 11 },
  adjustments: { ...arcadeSurface, minHeight: 40, backgroundColor: arcadeColors.panelRaised, paddingLeft: 8, paddingRight: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adjustmentLabel: { color: arcadeColors.muted, fontSize: 9, lineHeight: 10, fontWeight: '800' },
  adjustmentValue: { color: arcadeColors.white, fontSize: 11, lineHeight: 13, fontWeight: '900' },
  editRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  edit: { color: arcadeColors.yellow, fontSize: 11, lineHeight: 14, fontWeight: '900' },
  chevron: { color: arcadeColors.yellow, fontSize: 18, lineHeight: 18, fontWeight: '900' },
  start: { ...arcadeSurface, minHeight: 48, backgroundColor: arcadeColors.yellow, alignItems: 'center', justifyContent: 'center' },
  startLabel: { color: arcadeColors.ink, fontSize: 13, lineHeight: 16, fontWeight: '900' },
  message: { color: arcadeColors.white, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  pressed: { opacity: 0.72, transform: [{ translateX: 1 }, { translateY: 1 }] },
});
