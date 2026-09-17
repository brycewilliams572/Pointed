import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import { PlayerColorPicker } from '@/components/player-color-picker';
import { getPlayerColor } from '@/constants/player-colors';
import { gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
import type { Player } from '@/types/game';

type Props = {
  player: Player;
  index: number;
  canRemove: boolean;
  onChange: (changes: Partial<Pick<Player, 'name' | 'color'>>) => void;
  onRemove: () => void;
};

export function PlayerEditor({ player, index, canRemove, onChange, onRemove }: Props) {
  const theme = useGameScreenAppearance();
  const semibold = theme.fontsLoaded && gameFonts.semibold;
  const color = getPlayerColor(player.color);
  const label = `Player ${index + 1}`;
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.badge, { backgroundColor: color.background }]}>
        <Text accessibilityRole="header" style={[styles.badgeLabel, semibold, { color: color.foreground }]}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}${player.name.trim() ? `, ${player.name.trim()}` : ''}`}
          accessibilityState={{ disabled: !canRemove }}
          disabled={!canRemove}
          onPress={onRemove}
          style={({ pressed }) => [styles.remove, { opacity: !canRemove ? 0.4 : pressed ? 0.75 : 1 }]}>
          <Image source={require('../../assets/images/game/trash.svg')} tintColor={color.foreground}
            accessible={false} contentFit="contain" style={styles.removeIcon} />
        </Pressable>
      </View>
      <Text nativeID={`${player.id}-label`} style={[styles.label, semibold, { color: theme.text }]}>{label} name</Text>
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
        style={[styles.input, theme.fontsLoaded && gameFonts.regular, { color: theme.text, backgroundColor: theme.background, borderColor: theme.textSecondary }]}
      />
      <Text style={[styles.label, semibold, { color: theme.text }]}>{label} color</Text>
      <PlayerColorPicker centered color={player.color} playerLabel={label} onChange={(value) => onChange({ color: value })} />
      {!canRemove ? <Text style={[styles.message, { color: theme.textSecondary }]}>At least 1 player is required.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 12 },
  badge: { minHeight: 46, paddingLeft: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  badgeLabel: { flex: 1, paddingVertical: 12, fontSize: 18, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 16, lineHeight: 19, fontWeight: '600' },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 10, fontSize: 18, lineHeight: 22 },
  message: { fontSize: 16, lineHeight: 24 },
  remove: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removeIcon: { width: 19, height: 22 },
});
