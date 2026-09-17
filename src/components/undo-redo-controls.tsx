import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

type Props = { canUndo: boolean; canRedo: boolean; busy: boolean; undo: () => Promise<boolean>; redo: () => Promise<boolean>; grid?: boolean };

export function UndoRedoControls({ canUndo, canRedo, busy, undo, redo, grid = false }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.row, grid && styles.gridRow]}>
      {(['undo', 'redo'] as const).map((action) => {
        const disabled = busy || !(action === 'undo' ? canUndo : canRedo);
        return (
          <Pressable key={action} accessibilityRole="button"
            accessibilityLabel={action === 'undo' ? 'Undo last score change' : 'Redo last undone score change'}
            accessibilityState={{ disabled }} disabled={disabled} onPress={() => void (action === 'undo' ? undo() : redo())}
            style={[styles.button, { backgroundColor: theme.backgroundElement, opacity: disabled ? 0.4 : 1 }]}>
            {grid ? <Image source={action === 'undo' ? require('../../assets/images/game/undo.svg') : require('../../assets/images/game/redo.svg')}
              tintColor={theme.text} contentFit="contain" accessible={false} style={styles.icon} /> :
              <SymbolView name={{ ios: action === 'undo' ? 'arrow.uturn.backward' : 'arrow.uturn.forward', android: action, web: action }}
                tintColor={theme.text} size={24} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  gridRow: { gap: 3 },
  icon: { width: 24, height: 24 },
  button: { minWidth: 48, minHeight: 48, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
