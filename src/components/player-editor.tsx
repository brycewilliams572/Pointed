import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { arcadeColors, arcadeSurface, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
import { PlayerColorPicker } from '@/components/player-color-picker';
import { getPlayerColor } from '@/constants/player-colors';
import type { Player } from '@/types/game';

type Props = {
  player: Player;
  index: number;
  canRemove: boolean;
  onChange: (changes: Partial<Pick<Player, 'name' | 'color'>>) => void;
  onRemove: () => void;
};

export function PlayerEditor({ player, index, canRemove, onChange, onRemove }: Props) {
  const { fontsLoaded } = useGameScreenAppearance();
  const color = getPlayerColor(player.color);
  const label = `Player ${index + 1}`;
  return (
    <View style={styles.card}>
      <View style={[styles.badge, { backgroundColor: color.background }]}>
        <TextInput
          accessibilityLabel={`${label} name`}
          accessibilityHint={`Optional. Leave blank to use ${label}.`}
          value={player.name}
          onChangeText={(name) => onChange({ name })}
          placeholder={label}
          placeholderTextColor={color.foreground}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={32}
          style={[styles.name, fontsLoaded && gameFonts.display, { color: color.foreground }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${player.name.trim() || label}`}
          accessibilityState={{ disabled: !canRemove }} disabled={!canRemove} onPress={onRemove}
          style={({ pressed }) => [styles.remove, { opacity: !canRemove ? 0.4 : pressed ? 0.7 : 1 }]}>
          <Image source={require('../../assets/images/game/trash.svg')} tintColor={color.foreground}
            accessible={false} contentFit="contain" style={styles.removeIcon} />
        </Pressable>
      </View>
      <PlayerColorPicker centered color={player.color} playerLabel={label} onChange={(value) => onChange({ color: value })} />
      {!canRemove ? <Text style={styles.srNote}>At least one player is required.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...arcadeSurface,
    width: '100%',
    maxWidth: 342,
    minHeight: 208,
    alignSelf: 'center',
    backgroundColor: arcadeColors.panel,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: '100%',
    height: 52,
    borderWidth: 4,
    borderColor: arcadeColors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  name: {
    flex: 1,
    height: 44,
    paddingVertical: 8,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeIcon: { width: 19, height: 22 },
  srNote: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
