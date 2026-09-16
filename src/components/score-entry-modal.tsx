import { useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { getScoreChangeError, MAX_SCORE, parseScoreInput } from '@/services/scoring';
import type { Player } from '@/types/game';

type Props = {
  player: Player;
  method: 'manual' | 'set';
  onSubmit: (playerId: string, amount: number, method: 'manual' | 'set') => void;
  onClose: () => void;
};

export function ScoreEntryModal({ player, method, onSubmit, onClose }: Props) {
  const theme = useTheme();
  const { allowNegativeScores } = useSettings();
  const [input, setInput] = useState(method === 'set' ? String(player.score) : '');
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);
  const field = useRef<TextInput>(null);
  const parsed = parseScoreInput(input, method, allowNegativeScores);
  const action = method === 'set' ? 'Set Score' : parsed.value !== undefined
    ? (parsed.value < 0 ? `Subtract ${Math.abs(parsed.value)}` : `Add ${parsed.value}`) : 'Add points';

  function submit() {
    if (submitted.current) return;
    const result = parseScoreInput(input, method, allowNegativeScores);
    const message = result.error ?? getScoreChangeError(player.score, result.value!, method);
    if (message) {
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    submitted.current = true;
    onSubmit(player.id, result.value!, method);
    onClose();
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} onShow={() => field.current?.focus()}>
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View accessibilityViewIsModal style={styles.form}>
              <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
                {method === 'set' ? 'Set Score' : 'Add Custom Score'}
              </Text>
              <Text style={[styles.name, { color: theme.text }]}>{player.name}</Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>Current score: {player.score}</Text>
              <Text nativeID="score-input-label" style={[styles.label, { color: theme.text }]}>
                {method === 'set' ? 'New score' : 'Points to add'}
              </Text>
              <TextInput
                ref={field}
                accessibilityLabel={method === 'set' ? `New score for ${player.name}` : `Points to add to ${player.name}`}
                accessibilityLabelledBy="score-input-label"
                accessibilityHint={method === 'set' ? 'Replaces the current score.' : 'Changes the current score by this amount.'}
                value={input}
                onChangeText={(value) => { setInput(value); setError(null); }}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                autoCapitalize="none"
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={submit}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.textSecondary }]}
              />
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                {method === 'set' ? 'This replaces the current score.' : 'This adds to the current score.'}
                {' '}{allowNegativeScores ? 'Use a minus sign to enter a negative value.' : 'Negative values are off in Settings.'}
              </Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>Whole numbers only. Maximum score: {MAX_SCORE}.</Text>
              {error ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.text }]}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Cancel score entry" onPress={onClose} style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${action} for ${player.name}`} onPress={submit} style={({ pressed }) => [styles.button, { backgroundColor: theme.text }, pressed && { opacity: 0.75 }]}>
                  <Text style={[styles.label, { color: theme.background }]}>{action}</Text>
                </Pressable>
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
  heading: { fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '600' },
  label: { fontSize: 18, fontWeight: '600' },
  message: { fontSize: 16, lineHeight: 24 },
  input: { minHeight: 56, padding: 16, borderWidth: 1, borderRadius: 12, fontSize: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: { minHeight: 48, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
