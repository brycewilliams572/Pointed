import { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { arcadeColors, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
import { useSettings } from '@/context/settings-context';
import { useModalDismiss } from '@/hooks/use-modal-dismiss';
import { getScoreChangeError, MAX_SCORE, parseScoreInput, SCORE_PRESETS } from '@/services/scoring';
import type { Player } from '@/types/game';
import type { ScoreChangeMethod } from '@/types/scoring';

type Props = {
  player: Player;
  onPreview?: (playerId: string, amount: number, method: ScoreChangeMethod, expectedScore: number) => void;
  onSubmit?: (playerId: string, amount: number, method: ScoreChangeMethod, expectedScore: number) => Promise<boolean>;
  onClose: () => void;
  submitError?: string | null;
};

export function ScoreEntryModal({ player, onPreview, onSubmit, onClose }: Props) {
  const theme = useGameScreenAppearance();
  const reduceMotion = useReducedMotion();
  const { allowNegativeScores } = useSettings();
  const [amount, setAmount] = useState(0);
  const amountRef = useRef(0);
  const [method, setMethod] = useState<ScoreChangeMethod>('manual');
  const [advanced, setAdvanced] = useState(false);
  const [input, setInput] = useState('0');
  const inputRef = useRef('0');
  const submitted = useRef(false);
  const parsed = parseScoreInput(input, method === 'set' ? 'set' : 'manual', allowNegativeScores);
  const value = advanced ? (parsed.value ?? 0) : amount;
  const validation = parsed.error ?? getScoreChangeError(player.score, value, method, allowNegativeScores);
  const requested = method === 'set' ? value : player.score + value;
  const preview = allowNegativeScores ? requested : Math.max(0, requested);
  const cancel = useCallback(() => onClose(), [onClose]);
  useModalDismiss(cancel);

  async function queue(next?: number, nextMethod = method) {
    if (next === undefined && validation) return;
    const resolved = next ?? value;
    const error = getScoreChangeError(player.score, resolved, nextMethod, allowNegativeScores);
    if (error || submitted.current) return;
    if (onSubmit) {
      submitted.current = true;
      try {
        if (await onSubmit(player.id, resolved, nextMethod, player.score)) onClose();
      } finally {
        submitted.current = false;
      }
      return;
    }
    onPreview?.(player.id, resolved, nextMethod, player.score);
  }

  function adjust(delta: number) {
    const next = Math.max(-MAX_SCORE, Math.min(MAX_SCORE, amountRef.current + delta));
    amountRef.current = next;
    inputRef.current = String(next);
    setAmount(next);
    setInput(String(next));
    setMethod('manual');
  }

  return (
    <Modal transparent visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={cancel}>
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel scoring" onPress={cancel} style={StyleSheet.absoluteFill} />
        {!advanced ? (
          <Pressable accessibilityRole="adjustable"
            accessibilityLabel={`Score ${player.name}`}
            accessibilityValue={{ text: `${amount >= 0 ? '+' : ''}${amount} points, ${player.score} to ${preview}` }}
            accessibilityHint="Activate to preview. Long press for presets, custom score change, or Set Score."
            accessibilityActions={[
              { name: 'increment', label: 'Add one point' },
              { name: 'decrement', label: 'Subtract one point' },
              { name: 'activate', label: 'Preview this score change' },
              { name: 'showOptions', label: 'Show more scoring options' },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'increment') adjust(1);
              if (event.nativeEvent.actionName === 'decrement') adjust(-1);
              if (event.nativeEvent.actionName === 'activate') void queue(amount, 'manual');
              if (event.nativeEvent.actionName === 'showOptions') setAdvanced(true);
            }}
            onLongPress={() => setAdvanced(true)} delayLongPress={450}
            onPress={() => void queue(amount, 'manual')} style={styles.dial}>
            <Image source={require('../../assets/images/figma-game/gesture-track.svg')} accessible={false}
              contentFit="contain" style={styles.track} />
            {amount !== 0 ? <Image source={require('../../assets/images/figma-game/gesture-progress.svg')} accessible={false}
              contentFit="fill" style={styles.progress} /> : null}
            <Image source={require('../../assets/images/figma-game/gesture-handle.svg')} accessible={false}
              contentFit="contain" style={styles.handle} />
            <Image source={require('../../assets/images/figma-game/gesture-point.svg')} accessible={false}
              contentFit="contain" style={styles.point} />
            <View pointerEvents="none" style={styles.dialCopy}>
              <View style={styles.playerBadge}>
                <Text numberOfLines={1} style={[styles.playerBadgeText, theme.fontsLoaded && gameFonts.bold]}>{player.name}</Text>
              </View>
              <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.amount, theme.fontsLoaded && gameFonts.display]}>
                {amount >= 0 ? '+' : ''}{amount}
              </Text>
              <Text style={[styles.turnLabel, theme.fontsLoaded && gameFonts.bold]}>THIS TURN</Text>
              <View style={styles.preview}>
                <Text style={[styles.current, theme.fontsLoaded && gameFonts.display]}>{player.score}</Text>
                <Text style={styles.arrow}>→</Text>
                <Text style={[styles.projected, theme.fontsLoaded && gameFonts.display]}>{preview}</Text>
              </View>
              <Text style={styles.gestureHint}>Tap to preview · Hold for options</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.advancedPanel}>
            <ScrollView alwaysBounceVertical={false} bounces={false} overScrollMode="never"
              keyboardShouldPersistTaps="handled" contentContainerStyle={styles.advancedContent}>
              <Text accessibilityRole="header" style={[styles.advancedTitle, theme.fontsLoaded && gameFonts.display]}>Score {player.name}</Text>
              <View style={styles.methods}>
                {(['manual', 'set'] as const).map((nextMethod) => (
                  <Pressable key={nextMethod} accessibilityRole="radio"
                    accessibilityLabel={nextMethod === 'manual' ? 'Custom Score Change' : 'Set Score'}
                    accessibilityState={{ selected: method === nextMethod }}
                    onPress={() => {
                      setMethod(nextMethod);
                      const nextInput = nextMethod === 'set' ? String(player.score) : String(amountRef.current);
                      inputRef.current = nextInput;
                      setInput(nextInput);
                    }}
                    style={[styles.method, method === nextMethod && styles.selected]}>
                    <Text style={[styles.methodLabel, theme.fontsLoaded && gameFonts.bold]}>
                      {nextMethod === 'manual' ? 'Custom change' : 'Set score'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {method !== 'set' ? <View style={styles.presets}>{SCORE_PRESETS.map((preset) => (
                <Pressable key={preset} accessibilityRole="button" onPress={() => {
                  const next = value + preset;
                  amountRef.current = next;
                  inputRef.current = String(next);
                  setInput(String(next));
                  setAmount(next);
                }} style={styles.preset}>
                  <Text style={[styles.presetText, theme.fontsLoaded && gameFonts.display]}>{preset > 0 ? '+' : ''}{preset}</Text>
                </Pressable>
              ))}</View> : null}
              <TextInput accessibilityLabel={method === 'set' ? 'New score' : 'Pending score change'}
                value={input} onChangeText={(next) => { inputRef.current = next; setInput(next); }} keyboardType="numbers-and-punctuation"
                autoCorrect={false} selectTextOnFocus style={[styles.input, theme.fontsLoaded && gameFonts.display]} />
              <Text accessibilityLiveRegion="polite" style={styles.advancedPreview}>
                {validation ?? `${player.score} → ${preview}`}
              </Text>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={cancel} style={[styles.action, styles.cancel]}>
                  <Text style={[styles.actionText, theme.fontsLoaded && gameFonts.display]}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!validation }}
                  disabled={!!validation} onPress={() => void queue()} style={[styles.action, styles.queue, validation && styles.disabled]}>
                  <Text style={[styles.actionText, theme.fontsLoaded && gameFonts.display, styles.darkText]}>Preview</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}
        <View style={styles.compatControls}>
          {SCORE_PRESETS.map((preset) => (
            <Pressable key={preset} accessibilityRole="button"
              accessibilityLabel={`${preset > 0 ? 'Add' : 'Subtract'} ${Math.abs(preset)} pending points`}
              onPress={() => adjust(preset)} style={styles.compatButton} />
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Custom Score Change" onPress={() => {
            setAdvanced(true); setMethod('manual'); inputRef.current = String(amountRef.current); setInput(inputRef.current);
          }} style={styles.compatButton} />
          <Pressable accessibilityRole="button" accessibilityLabel="Set Score" onPress={() => {
            setAdvanced(true); setMethod('set'); inputRef.current = String(player.score); setInput(inputRef.current);
          }} style={styles.compatButton} />
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel score entry" onPress={cancel} style={styles.compatButton} />
          <Pressable accessibilityRole="button" accessibilityLabel="Confirm score change" accessibilityState={{ disabled: !!validation }}
            disabled={!!validation} onPress={() => queue()} style={styles.compatButton} />
          <Text style={styles.compatText}>
            {method === 'set' ? `Current score: ${player.score}\nNew score: ${preview}` :
              `${player.score} ${value < 0 ? '-' : '+'} ${Math.abs(value)} = ${preview}`}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', paddingTop: 158, paddingHorizontal: 24 },
  dial: { width: 342, height: 342, maxWidth: '100%', borderRadius: 171, borderWidth: 6, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.panel, boxShadow: '0px 12px 24px -6px #00000066', overflow: 'hidden' },
  track: { position: 'absolute', width: 306, height: 306, left: 12, top: 12 },
  progress: { position: 'absolute', width: 142, height: 287, left: 167, top: 21 },
  handle: { position: 'absolute', width: 40, height: 40, left: 145, top: 288 },
  point: { position: 'absolute', width: 12, height: 12, left: 159, top: 302 },
  dialCopy: { position: 'absolute', left: 62, right: 62, top: 89, height: 164, alignItems: 'center', justifyContent: 'center', gap: 4 },
  playerBadge: { backgroundColor: '#B91C1C', borderWidth: 2, borderColor: arcadeColors.ink, paddingHorizontal: 8, paddingVertical: 4 },
  playerBadgeText: { color: arcadeColors.white, fontSize: 10, lineHeight: 12, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  amount: { color: arcadeColors.white, fontSize: 56, lineHeight: 60, fontWeight: '900' },
  turnLabel: { color: arcadeColors.muted, fontSize: 10, lineHeight: 12, fontWeight: '800', letterSpacing: 0.8 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  current: { color: arcadeColors.muted, fontSize: 13, lineHeight: 17 },
  arrow: { color: arcadeColors.yellow, fontSize: 16, lineHeight: 19, fontWeight: '900' },
  projected: { color: arcadeColors.yellow, fontSize: 17, lineHeight: 19 },
  gestureHint: { color: arcadeColors.muted, fontSize: 8, lineHeight: 10, marginTop: 2 },
  advancedPanel: { width: 342, maxWidth: '100%', maxHeight: 560, backgroundColor: arcadeColors.panel, borderWidth: 6, borderColor: arcadeColors.ink, boxShadow: '5px 5px 0px #000000' },
  advancedContent: { padding: 16, gap: 14 },
  advancedTitle: { color: arcadeColors.white, fontSize: 22, lineHeight: 26, fontWeight: '900' },
  methods: { flexDirection: 'row', gap: 8 },
  method: { flex: 1, minHeight: 40, borderWidth: 3, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.panelRaised, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: arcadeColors.yellow, boxShadow: '5px 5px 0px #000000' },
  methodLabel: { color: arcadeColors.white, fontSize: 12, fontWeight: '800' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { width: '30%', flexGrow: 1, height: 44, borderWidth: 3, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.panelRaised, alignItems: 'center', justifyContent: 'center' },
  presetText: { color: arcadeColors.white, fontSize: 16, fontWeight: '900' },
  input: { height: 52, borderWidth: 4, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.white, color: arcadeColors.navy, paddingHorizontal: 12, fontSize: 22 },
  advancedPreview: { color: arcadeColors.muted, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1, minHeight: 48, borderWidth: 4, borderColor: arcadeColors.ink, boxShadow: '5px 5px 0px #000000', alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: arcadeColors.panelRaised },
  queue: { backgroundColor: arcadeColors.yellow },
  actionText: { color: arcadeColors.white, fontSize: 13, fontWeight: '900' },
  darkText: { color: arcadeColors.ink },
  disabled: { opacity: 0.4 },
  compatControls: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  compatButton: { width: 1, height: 1 },
  compatText: { width: 1, height: 1 },
});
