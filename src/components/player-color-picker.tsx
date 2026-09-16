import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomColorPicker } from '@/components/custom-color-picker';
import { getPlayerColor, PLAYER_COLORS } from '@/constants/player-colors';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  color: string;
  playerLabel: string;
  onChange: (color: string) => void;
};

export function PlayerColorPicker({ color, playerLabel, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.options}>
      {PLAYER_COLORS.map((option) => (
        <Pressable
          key={option.name}
          accessibilityRole="radio"
          accessibilityLabel={`${option.name} color for ${playerLabel}`}
          accessibilityState={{ selected: color === option.background }}
          onPress={() => onChange(option.background)}
          style={({ pressed }) => [styles.circle, { backgroundColor: option.background, borderColor: theme.textSecondary }, pressed && { opacity: 0.75 }]}>
          {color === option.background ? (
            <Text maxFontSizeMultiplier={1} style={[styles.symbol, { color: getPlayerColor(color).foreground }]}>✓</Text>
          ) : null}
        </Pressable>
      ))}
      <CustomColorPicker color={color} playerLabel={playerLabel} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  circle: { width: 48, height: 48, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 24, fontWeight: '700' },
});
