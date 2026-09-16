import { useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';

type Props = { title: string; description: string; actionLabel: string; onConfirm: () => Promise<boolean>; onClose: () => void; children?: ReactNode };

export function ConfirmActionModal({ title, description, actionLabel, onConfirm, onClose, children }: Props) {
  const theme = useTheme();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  function cancel() { if (!pending.current) onClose(); }
  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      if (await onConfirm()) onClose();
      else setError(true);
    } catch { setError(true); }
    finally { pending.current = false; setBusy(false); }
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={cancel}>
      <SafeAreaView style={styles.overlay}>
        <View accessibilityViewIsModal style={[styles.panel, { backgroundColor: theme.background }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{description}</Text>
            {children}
            {error ? <Text accessibilityLiveRegion="polite" style={[styles.text, { color: theme.text }]}>The action could not be saved. Please try again.</Text> : null}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel" disabled={busy} accessibilityState={{ disabled: busy }} onPress={cancel}
                style={[styles.button, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.text, { color: theme.text }]}>Cancel</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={confirm}
                style={[styles.button, { backgroundColor: '#B91C1C' }]}><Text style={[styles.text, { color: '#FFFFFF' }]}>{busy ? 'Saving...' : actionLabel}</Text></Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', padding: 24, justifyContent: 'center' },
  panel: { width: '100%', maxWidth: 600, maxHeight: '90%', alignSelf: 'center', borderRadius: 20 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  text: { fontSize: 18, lineHeight: 26 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: { minHeight: 48, flexGrow: 1, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
