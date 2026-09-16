import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.home}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
              Pointed
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Keep score for anything.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New Game"
            accessibilityHint="Shows a message that game setup is coming soon."
            onPress={() => Alert.alert('New Game', 'Game setup is coming soon.')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.text },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.buttonLabel, { color: colors.background }]}>New Game</Text>
          </Pressable>

          <View style={[styles.continueSection, { backgroundColor: colors.backgroundElement }]}>
            <Pressable
              disabled
              accessibilityRole="button"
              accessibilityLabel="Continue Game"
              accessibilityHint="No game to continue yet."
              accessibilityState={{ disabled: true }}
              style={styles.button}>
              <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>
                Continue Game
              </Text>
            </Pressable>
            <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
              No game to continue yet.
            </Text>
          </View>
        </View>
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
  home: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 16,
  },
  heading: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  continueSection: {
    borderRadius: 16,
    paddingBottom: 20,
  },
  placeholder: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
