import { useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPlayerColor } from '@/constants/player-colors';
import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { getScoreChangeError, MAX_SCORE, parseScoreInput, SCORE_PRESETS } from '@/services/scoring';
import type { Player } from '@/types/game';

type Draft = { method: 'manual' | 'set'; input: string; custom: boolean };
type Props = {
  player: Player;
  onSubmit: (playerId: string, amount: number, method: 'manual' | 'set', expectedScore: number) => Promise<boolean>;
  onClose: () => void;
  submitError?: string | null;
};

export function ScoreEntryModal({ player, onSubmit, onClose, submitError }: Props) {
  const theme = useTheme();
  const color = getPlayerColor(player.color);
  const { allowNegativeScores } = useSettings();
  const [draft, setDraft] = useState<Draft>({ method: 'manual', input: '0', custom: false });
  const latest = useRef(draft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);
  const parsed = parseScoreInput(draft.input, draft.method, allowNegativeScores);
  const validation = parsed.error ?? getScoreChangeError(player.score, parsed.value!, draft.method, allowNegativeScores);
  const amount = parsed.value ?? 0;
  const requested = draft.method === 'set' ? amount : player.score + amount;
  const preview = allowNegativeScores ? requested : Math.max(0, requested);

  function update(next: Draft) {
    if (submitted.current) return;
    latest.current = next;
    setDraft(next);
    setError(null);
  }

  function addPreset(delta: number) {
    const current = latest.current;
    const parsed = parseScoreInput(current.input, 'manual', allowNegativeScores);
    if (parsed.error) { setError(parsed.error); return; }
    const next = parsed.value! + delta;
    if (Math.abs(next) > MAX_SCORE) { setError(`Pending changes must stay between ${-MAX_SCORE} and ${MAX_SCORE}.`); return; }
    update({ method: 'manual', input: String(next), custom: current.custom });
  }

  function cancel() { if (!submitted.current) onClose(); }

  async function confirm() {
    if (submitted.current) return;
    const current = latest.current;
    const result = parseScoreInput(current.input, current.method, allowNegativeScores);
    const message = result.error ?? getScoreChangeError(player.score, result.value!, current.method, allowNegativeScores);
    if (message) { setError(message); AccessibilityInfo.announceForAccessibility(message); return; }
    submitted.current = true;
    setSaving(true);
    try {
      if (await onSubmit(player.id, result.value!, current.method, player.score)) {
        onClose();
        return;
      }
      setError('The change could not be saved. Close this menu and try again.');
    } catch {
      setError('The change could not be saved. Please try again.');
    } finally {
      submitted.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={cancel}>
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View accessibilityViewIsModal style={styles.form}>
              <View style={[styles.player, { backgroundColor: color.background }]}>
                <Text accessibilityRole="header" style={[styles.heading, { color: color.foreground }]}>{player.name}</Text>
                <Text style={[styles.label, { color: color.foreground }]}>Current score: {player.score}</Text>
              </View>
              <View style={styles.actions}>
                {(['manual', 'set'] as const).map((method) => (
                  <Pressable key={method} accessibilityRole="button" accessibilityLabel={method === 'manual' ? 'Custom Score Change' : 'Set Score'}
                    accessibilityState={{ selected: draft.method === method, disabled: saving }} disabled={saving}
                    onPress={() => update({ method, input: method === 'set' ? String(player.score) : draft.method === 'manual' ? draft.input : '0', custom: true })}
                    style={[styles.button, { backgroundColor: draft.method === method ? theme.backgroundSelected : theme.backgroundElement }]}>
                    <Text style={[styles.label, { color: theme.text }]}>{method === 'manual' ? 'Custom Score Change' : 'Set Score'}</Text>
                  </Pressable>
                ))}
              </View>
              {draft.method === 'manual' ? (
                <View style={styles.presets}>
                  {SCORE_PRESETS.map((delta) => (
                    <Pressable key={delta} accessibilityRole="button" accessibilityLabel={`${delta > 0 ? 'Add' : 'Subtract'} ${Math.abs(delta)} pending points`}
                      accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => addPreset(delta)}
                      style={[styles.preset, { backgroundColor: theme.backgroundElement }]}>
                      <Text style={[styles.heading, { color: theme.text }]}>{delta > 0 ? '+' : ''}{delta}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {draft.custom ? (
                <>
                  <Text style={[styles.label, { color: theme.text }]}>{draft.method === 'set' ? 'New score' : 'Pending change (replaces the pending amount)'}</Text>
                  <TextInput accessibilityLabel={draft.method === 'set' ? 'New score' : 'Pending score change'}
                    value={draft.input} editable={!saving} onChangeText={(input) => update({ ...draft, input })}
                    keyboardType="numbers-and-punctuation" autoCorrect={false} selectTextOnFocus returnKeyType="done"
                    style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]} />
                </>
              ) : null}
              <View style={[styles.preview, { backgroundColor: theme.backgroundElement }]} accessibilityLiveRegion="polite">
                <Text style={[styles.label, { color: theme.textSecondary }]}>{draft.method === 'set' ? 'Set Score preview' : `Pending change: ${amount >= 0 ? '+' : ''}${amount}`}</Text>
                <Text style={[styles.heading, { color: theme.text }]}>
                  {validation ? 'Enter a valid score to preview.' : draft.method === 'set' ? `Current score: ${player.score}\nNew score: ${preview}` : `${player.score} ${amount < 0 ? '-' : '+'} ${Math.abs(amount)} = ${preview}`}
                </Text>
                {!validation && requested !== preview ? <Text style={[styles.message, { color: theme.textSecondary }]}>Subtraction stops at 0.</Text> : null}
              </View>
              <Text style={[styles.message, { color: theme.textSecondary }]}>Nothing is saved until Confirm. {allowNegativeScores ? 'Totals may go below 0.' : 'Negative totals are off.'} Whole numbers only; maximum {MAX_SCORE}.</Text>
              {error || validation ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.text }]}>{error ? submitError ?? error : validation}</Text> : null}
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Cancel score entry" accessibilityState={{ disabled: saving }} disabled={saving} onPress={cancel}
                  style={[styles.button, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.label, { color: theme.text }]}>Cancel</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Confirm score change" accessibilityState={{ disabled: saving || !!validation, busy: saving }} disabled={saving || !!validation} onPress={confirm}
                  style={[styles.button, { backgroundColor: theme.text, opacity: validation ? 0.5 : 1 }]}><Text style={[styles.label, { color: theme.background }]}>{saving ? 'Saving...' : 'Confirm'}</Text></Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24 },
  form: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 16 },
  player: { borderRadius: 16, padding: 16, gap: 8 },
  heading: { fontSize: 26, fontWeight: '700' },
  label: { fontSize: 18, fontWeight: '600' },
  message: { fontSize: 16, lineHeight: 24 },
  input: { minHeight: 56, padding: 16, borderWidth: 1, borderRadius: 12, fontSize: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: { minHeight: 48, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  preset: { width: '30%', flexGrow: 1, minHeight: 60, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  preview: { borderRadius: 16, padding: 16, gap: 12 },
});
