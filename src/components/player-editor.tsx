import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PlayerColorPicker } from '@/components/player-color-picker';
import { getPlayerColor } from '@/constants/player-colors';
import { useTheme } from '@/hooks/use-theme';
import type { Player } from '@/types/game';

type Props = {
  player: Player;
  index: number;
  canRemove: boolean;
  onChange: (changes: Partial<Pick<Player, 'name' | 'color'>>) => void;
  onRemove: () => void;
};

export function PlayerEditor({ player, index, canRemove, onChange, onRemove }: Props) {
  const theme = useTheme();
  const color = getPlayerColor(player.color);
  const label = `Player ${index + 1}`;
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Text accessibilityRole="header" style={[styles.badge, { backgroundColor: color.background, color: color.foreground }]}>
        {label}
      </Text>
      <Text nativeID={`${player.id}-label`} style={[styles.label, { color: theme.text }]}>{label} name</Text>
      <TextInput
        accessibilityLabel={`${label} name`}
        accessibilityLabelledBy={`${player.id}-label`}
        accessibilityHint={`Optional. Leave blank to use ${label}.`}
        value={player.name}
        onChangeText={(name) => onChange({ name })}
        placeholder={label}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="words"
        autoCorrect={false}
        style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.textSecondary }]}
      />
      <Text style={[styles.label, { color: theme.text }]}>{label} color</Text>
      <PlayerColorPicker color={player.color} playerLabel={label} onChange={(value) => onChange({ color: value })} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}${player.name.trim() ? `, ${player.name.trim()}` : ''}`}
        accessibilityState={{ disabled: !canRemove }}
        disabled={!canRemove}
        onPress={onRemove}
        style={({ pressed }) => [styles.remove, { borderColor: theme.textSecondary }, pressed && { opacity: 0.75 }]}>
        <Text style={[styles.label, { color: canRemove ? theme.text : theme.textSecondary }]}>Remove {label}</Text>
      </Pressable>
      {!canRemove ? <Text style={[styles.message, { color: theme.textSecondary }]}>At least 1 player is required.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 12 },
  badge: { padding: 12, borderRadius: 10, fontSize: 18, fontWeight: '600' },
  label: { fontSize: 16, fontWeight: '600' },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 10, fontSize: 18 },
  message: { fontSize: 16, lineHeight: 24 },
  remove: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center' },
});
