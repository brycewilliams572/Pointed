import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PLAYER_COLORS } from '@/constants/player-colors';
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
      {PLAYER_COLORS.map((option) => {
        const selected = color === option.background;
        return (
          <Pressable
            key={option.name}
            accessibilityRole="radio"
            accessibilityLabel={`${option.name} color for ${playerLabel}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.background)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: option.background, borderColor: selected ? theme.text : 'transparent' },
              pressed && { opacity: 0.75 },
            ]}>
            <Text style={[styles.label, { color: option.foreground }]}>
              {selected ? '✓ ' : ''}{option.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 48, minWidth: 80, borderWidth: 2, borderRadius: 12, padding: 10, justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
