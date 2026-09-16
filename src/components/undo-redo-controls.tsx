import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

type Props = { canUndo: boolean; canRedo: boolean; busy: boolean; undo: () => Promise<boolean>; redo: () => Promise<boolean> };

export function UndoRedoControls({ canUndo, canRedo, busy, undo, redo }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {(['undo', 'redo'] as const).map((action) => {
        const disabled = busy || !(action === 'undo' ? canUndo : canRedo);
        return (
          <Pressable key={action} accessibilityRole="button"
            accessibilityLabel={action === 'undo' ? 'Undo last score change' : 'Redo last undone score change'}
            accessibilityState={{ disabled }} disabled={disabled} onPress={() => void (action === 'undo' ? undo() : redo())}
            style={[styles.button, { backgroundColor: theme.backgroundElement, opacity: disabled ? 0.4 : 1 }]}>
            <SymbolView name={{ ios: action === 'undo' ? 'arrow.uturn.backward' : 'arrow.uturn.forward', android: action, web: action }}
              tintColor={theme.text} size={24} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  button: { minWidth: 48, minHeight: 48, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
