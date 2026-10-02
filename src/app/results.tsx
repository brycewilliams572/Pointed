import { useCallback } from 'react';
import { Image, type ImageSource } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { arcadeColors, arcadeSurface, GameScreenHeader, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
import { getPlayerColor } from '@/constants/player-colors';
import { useGame } from '@/context/game-context';
import type { Player } from '@/types/game';

export default function ResultsScreen() {
  const { gameId, view } = useLocalSearchParams<{ gameId?: string; view?: string }>();
  const { game, events, openGame, loadingGame } = useGame();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontsLoaded } = useGameScreenAppearance();
  useFocusEffect(useCallback(() => { if (gameId) void openGame(gameId); }, [gameId, openGame]));
  const compact = view === 'leaderboard';
  const players = [...(game?.players ?? [])].sort((a, b) => b.score - a.score);
  const winner = players[0];
  const runnerUp = players[1];
  const margin = winner && runnerUp ? Math.abs(winner.score - runnerUp.score) : 0;
  const last = events[0];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, { paddingTop: Math.max(66, insets.top + 4) }]}>
        <GameScreenHeader title={compact ? 'Leader Board' : 'Results'} backLabel="Home"
          onBack={() => router.replace('/')} fontsLoaded={fontsLoaded} />
        <ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never"
          contentContainerStyle={[styles.content, compact && styles.compactContent]}>
          {!game ? <Text style={[styles.empty, fontsLoaded && gameFonts.display]}>{loadingGame ? 'Loading results…' : 'This game could not be loaded.'}</Text> : (
            <>
              <GameSummary name={game.name ?? 'Game Name'} plays={events.length} fontsLoaded={fontsLoaded} />
              {!compact && winner ? <WinnerAnnouncement winner={winner} margin={margin} fontsLoaded={fontsLoaded} /> : null}
              {compact ? <Recap players={players} last={last} label="MATCH DISTRIBUTION" fontsLoaded={fontsLoaded} /> : null}
              <View style={styles.finalScores}>
                {players.slice(0, 2).map((player, index) => <PlayerResult key={player.id} player={player}
                  winner={!compact && index === 0} placement={index + 1} margin={index === 0 ? 0 : Math.abs(players[0].score - player.score)}
                  fontsLoaded={fontsLoaded} />)}
              </View>
              {!compact ? <Recap players={players} last={last} label="MATCH RECAP" fontsLoaded={fontsLoaded} /> : null}
              <View style={styles.spacer} />
              {!compact ? (
                <View style={styles.postGame}>
                  <ActionButton label="Play again" icon={require('../../assets/images/figma-game/rotate.svg')}
                    primary onPress={() => router.push({ pathname: '/new-game', params: { rematch: '1', gameId: game.id } })} fontsLoaded={fontsLoaded} />
                  <View style={styles.secondaryActions}>
                    <ActionButton label="History" icon={require('../../assets/images/figma-game/history.svg')}
                      onPress={() => router.push({ pathname: '/history', params: { gameId: game.id } })} fontsLoaded={fontsLoaded} />
                    <ActionButton label="Done" icon={require('../../assets/images/figma-game/results-check.svg')}
                      onPress={() => router.replace('/')} fontsLoaded={fontsLoaded} />
                  </View>
                  <Text style={[styles.saved, fontsLoaded && gameFonts.regular]}>Game saved to history</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function GameSummary({ name, plays, fontsLoaded }: { name: string; plays: number; fontsLoaded: boolean }) {
  return <View style={styles.summary}>
    <Text numberOfLines={1} style={[styles.summaryTitle, fontsLoaded && gameFonts.display]}>{name}</Text>
    <View style={styles.summaryMeta}>
      <Text style={[styles.summaryMetaText, fontsLoaded && gameFonts.bold]}>ROUND 1</Text>
      <Text style={[styles.summaryMetaText, fontsLoaded && gameFonts.bold]}>04:36</Text>
      <Text style={[styles.summaryMetaText, fontsLoaded && gameFonts.bold]}>{plays} PLAYS</Text>
    </View>
  </View>;
}

function WinnerAnnouncement({ winner, margin, fontsLoaded }: { winner: Player; margin: number; fontsLoaded: boolean }) {
  const color = getPlayerColor(winner.color);
  return <View style={[styles.winner, { backgroundColor: color.background }]}>
    <View style={styles.trophyTile}><Image source={require('../../assets/images/figma-game/results-trophy.svg')} accessible={false} style={styles.trophy} /></View>
    <View style={styles.winnerCopy}>
      <Text style={[styles.eyebrow, fontsLoaded && gameFonts.bold]}>GAME OVER</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.winnerName, fontsLoaded && gameFonts.display]}>{winner.name.toUpperCase()} WINS!</Text>
      <Text style={[styles.margin, fontsLoaded && gameFonts.bold]}>Victory by {margin} {margin === 1 ? 'point' : 'points'}</Text>
    </View>
  </View>;
}

function PlayerResult({ player, winner, placement, margin, fontsLoaded }: {
  player: Player; winner: boolean; placement: number; margin: number; fontsLoaded: boolean;
}) {
  const color = getPlayerColor(player.color);
  return <View style={styles.resultCard}>
    <View style={[styles.identity, { backgroundColor: color.background }]}>
      <Text numberOfLines={1} style={[styles.playerName, fontsLoaded && gameFonts.display, { color: color.foreground }]}>{player.name}</Text>
      <View style={styles.placement}><Text style={[styles.placementText, fontsLoaded && gameFonts.display, winner && styles.winnerText]}>
        {winner ? 'WINNER' : placement === 1 ? '1st' : `${placement}ND`}
      </Text></View>
    </View>
    <View style={styles.scoreWell}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.finalScore, fontsLoaded && gameFonts.display]}>{player.score}</Text>
      <Text numberOfLines={1} style={[styles.scoreLabel, fontsLoaded && gameFonts.bold]}>
        {placement === 1 ? 'FINAL SCORE' : `${margin} POINTS BEHIND`}
      </Text>
    </View>
  </View>;
}

function Recap({ players, last, label, fontsLoaded }: {
  players: Player[]; last?: { playerName: string; amount: number }; label: string; fontsLoaded: boolean;
}) {
  const total = Math.max(1, players.slice(0, 2).reduce((sum, player) => sum + Math.abs(player.score), 0));
  return <View style={styles.recap}>
    <Text style={[styles.recapLabel, fontsLoaded && gameFonts.bold]}>{label}</Text>
    <View style={styles.progress}>
      {players.slice(0, 2).map((player) => <View key={player.id}
        style={[styles.progressBar, { backgroundColor: getPlayerColor(player.color).background, flex: Math.max(1, Math.abs(player.score) / total) }]} />)}
    </View>
    <Text style={[styles.lastPlay, fontsLoaded && gameFonts.regular]}>
      {last ? `Last play · ${last.playerName} ${last.amount >= 0 ? '+' : ''}${last.amount} · just now` : 'No recorded plays'}
    </Text>
  </View>;
}

function ActionButton({ label, icon, primary = false, onPress, fontsLoaded }: {
  label: string; icon: ImageSource; primary?: boolean; onPress: () => void; fontsLoaded: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.action, primary && styles.primaryAction, pressed && styles.pressed]}>
    <Image source={icon} accessible={false} style={styles.actionIcon} />
    <Text style={[styles.actionLabel, fontsLoaded && gameFonts.display, primary && styles.primaryActionLabel]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: arcadeColors.navy },
  content: { width: '100%', maxWidth: 390, flexGrow: 1, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 18, gap: 14 },
  compactContent: { gap: 14 },
  summary: { ...arcadeSurface, height: 60, backgroundColor: arcadeColors.white, paddingHorizontal: 8, paddingVertical: 5, gap: 2 },
  summaryTitle: { color: arcadeColors.navy, fontSize: 16, lineHeight: 19 },
  summaryMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryMetaText: { color: arcadeColors.navy, fontSize: 11, lineHeight: 13, fontWeight: '700' },
  winner: { ...arcadeSurface, height: 104, paddingHorizontal: 10, gap: 12, flexDirection: 'row', alignItems: 'center' },
  trophyTile: { width: 62, height: 62, backgroundColor: arcadeColors.yellow, borderWidth: 4, borderColor: arcadeColors.ink, alignItems: 'center', justifyContent: 'center' },
  trophy: { width: 30, height: 30 },
  winnerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: arcadeColors.white, fontSize: 10, lineHeight: 12, fontWeight: '800' },
  winnerName: { color: arcadeColors.white, fontSize: 25, lineHeight: 29 },
  margin: { color: arcadeColors.white, fontSize: 11, lineHeight: 13, fontWeight: '700' },
  finalScores: { height: 152, flexDirection: 'row', gap: 12 },
  resultCard: { ...arcadeSurface, flex: 1, minWidth: 0, backgroundColor: arcadeColors.panel, height: 152, padding: 6, gap: 8 },
  identity: { height: 38, borderWidth: 3, borderColor: arcadeColors.ink, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  playerName: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 18 },
  placement: { height: 21, backgroundColor: arcadeColors.ink, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  placementText: { color: arcadeColors.white, fontSize: 8, lineHeight: 10 },
  winnerText: { color: arcadeColors.yellow },
  scoreWell: { height: 76, backgroundColor: arcadeColors.scoreWell, borderWidth: 4, borderColor: arcadeColors.ink, alignItems: 'center', justifyContent: 'center' },
  finalScore: { color: arcadeColors.white, fontSize: 42, lineHeight: 43 },
  scoreLabel: { color: arcadeColors.muted, fontSize: 9, lineHeight: 11, fontWeight: '700' },
  recap: { ...arcadeSurface, height: 78, backgroundColor: arcadeColors.panelRaised, paddingHorizontal: 6, paddingVertical: 5, gap: 7 },
  recapLabel: { color: arcadeColors.muted, fontSize: 10, lineHeight: 12, fontWeight: '800' },
  progress: { height: 16, flexDirection: 'row', gap: 5, alignItems: 'center' },
  progressBar: { height: 12, borderWidth: 2, borderColor: arcadeColors.ink },
  lastPlay: { color: arcadeColors.muted, fontSize: 10, lineHeight: 12 },
  spacer: { flexGrow: 1, minHeight: 93 },
  postGame: { gap: 14 },
  secondaryActions: { height: 48, flexDirection: 'row', gap: 12 },
  action: { ...arcadeSurface, minHeight: 48, flex: 1, backgroundColor: arcadeColors.panelRaised, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  primaryAction: { backgroundColor: arcadeColors.yellow },
  actionIcon: { width: 17, height: 17 },
  actionLabel: { color: arcadeColors.white, fontSize: 13, lineHeight: 16 },
  primaryActionLabel: { color: arcadeColors.ink },
  saved: { color: arcadeColors.muted, fontSize: 11, lineHeight: 13, textAlign: 'center', marginTop: 1 },
  pressed: { opacity: 0.72, transform: [{ translateX: 1 }, { translateY: 1 }] },
  empty: { color: arcadeColors.white, fontSize: 18, textAlign: 'center', marginTop: 80 },
});
