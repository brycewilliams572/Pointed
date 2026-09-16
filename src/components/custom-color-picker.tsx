import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlayerColor } from '@/constants/player-colors';
import { useTheme } from '@/hooks/use-theme';

export type CustomColorPickerProps = {
  color: string;
  playerLabel: string;
  onChange: (color: string) => void;
};

// A visual palette on Android/web; iOS resolves to Apple's native picker instead.
const CUSTOM_COLORS = [0, 85, 170, 255].flatMap((r) =>
  [0, 85, 170, 255].flatMap((g) => [0, 85, 170, 255].map((b) =>
    '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()
  ))
);

export function CustomColorPicker({ color, playerLabel, onChange }: CustomColorPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = getPlayerColor(color);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Choose custom color for ${playerLabel}`} onPress={() => setOpen(true)} style={[styles.circle, { backgroundColor: color, borderColor: theme.textSecondary }]}>
        <Text maxFontSizeMultiplier={1} style={[styles.symbol, { color: selected.foreground }]}>+</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Choose a color for {playerLabel}</Text>
            <View style={styles.palette}>
              {CUSTOM_COLORS.map((value) => (
                <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Color ${value}`} accessibilityState={{ selected: value === color }} onPress={() => { onChange(value); setOpen(false); }} style={[styles.circle, { backgroundColor: value, borderColor: theme.textSecondary }]}>
                  {value === color ? <Text style={[styles.symbol, { color: getPlayerColor(value).foreground }]}>✓</Text> : null}
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel color selection" onPress={() => setOpen(false)} style={styles.cancel}>
              <Text style={[styles.heading, { color: theme.text }]}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 24 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  circle: { width: 48, height: 48, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 20, fontWeight: '600' },
  cancel: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center' },
});
