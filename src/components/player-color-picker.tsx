import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getPlayerColor, normalizePlayerColor, PLAYER_COLORS } from '@/constants/player-colors';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  color: string;
  playerLabel: string;
  onChange: (color: string) => void;
};

export function PlayerColorPicker({ color, playerLabel, onChange }: Props) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(color);
  const customSelected = !PLAYER_COLORS.some((option) => option.background === color);
  const normalized = normalizePlayerColor(draft);
  const preview = getPlayerColor(normalized ?? color);
  const selectedColor = getPlayerColor(color);

  return (
    <View style={styles.container}>
      <View style={styles.options}>
        {PLAYER_COLORS.map((option) => {
          const selected = color === option.background;
          return (
            <Pressable
              key={option.name}
              accessibilityRole="radio"
              accessibilityLabel={`${option.name} color for ${playerLabel}`}
              accessibilityState={{ selected }}
              onPress={() => { onChange(option.background); setEditing(false); }}
              style={({ pressed }) => [
                styles.circle,
                { backgroundColor: option.background, borderColor: theme.textSecondary },
                pressed && styles.pressed,
              ]}>
              {selected ? <Text maxFontSizeMultiplier={1} style={[styles.symbol, { color: getPlayerColor(option.background).foreground }]}>✓</Text> : null}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose custom color for ${playerLabel}`}
          accessibilityState={{ expanded: editing, selected: customSelected }}
          accessibilityValue={customSelected ? { text: selectedColor.name } : undefined}
          onPress={() => { setDraft(color); setEditing(!editing); }}
          style={({ pressed }) => [
            styles.circle,
            { backgroundColor: customSelected ? color : theme.background, borderColor: theme.textSecondary },
            pressed && styles.pressed,
          ]}>
          <Text maxFontSizeMultiplier={1} style={[styles.symbol, { color: customSelected ? selectedColor.foreground : theme.text }]}>
            {customSelected ? '✓' : '+'}
          </Text>
        </Pressable>
      </View>
      {editing ? (
        <View style={styles.container}>
          <Text style={[styles.label, { color: theme.text }]}>Custom color (hex)</Text>
          <TextInput
            accessibilityLabel={`Custom hex color for ${playerLabel}`}
            accessibilityHint="Enter three or six hexadecimal digits, for example #3366FF."
            value={draft}
            onChangeText={setDraft}
            placeholder="#3366FF"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.textSecondary }]}
          />
          <View style={[styles.preview, { backgroundColor: preview.background }]}>
            <Text style={[styles.label, { color: preview.foreground }]}>Aa · {playerLabel}</Text>
          </View>
          {!normalized ? (
            <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.text }]}>
              Enter 3 or 6 hex digits (0–9, A–F), such as #3366FF.
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Apply custom color to ${playerLabel}`}
              accessibilityState={{ disabled: !normalized }}
              disabled={!normalized}
              onPress={() => { if (normalized) { onChange(normalized); setEditing(false); } }}
              style={({ pressed }) => [styles.action, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
              <Text style={[styles.label, { color: normalized ? theme.text : theme.textSecondary }]}>Apply color</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel custom color" onPress={() => setEditing(false)} style={styles.action}>
              <Text style={[styles.label, { color: theme.text }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  circle: { width: 48, height: 48, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 16, fontWeight: '600' },
  message: { fontSize: 16, lineHeight: 24 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 18 },
  preview: { padding: 16, borderRadius: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minHeight: 48, padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
