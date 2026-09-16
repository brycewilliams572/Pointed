import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

type PlaceholderScreenProps = {
  message: string;
};

export function PlaceholderScreen({ message }: PlaceholderScreenProps) {
  const colors = useTheme();

  return (
    // The native stack header already handles the top safe area.
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
});
