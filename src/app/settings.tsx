import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { GameScreenHeader, gameFonts, useGameScreenAppearance } from '@/components/game-screen-chrome';
import { useSettings } from '@/context/settings-context';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const appearanceTheme = useGameScreenAppearance();
  const colorScheme = useAppColorScheme();
  const insets = useSafeAreaInsets();
  const { appearance, setAppearance, allowNegativeScores, setAllowNegativeScores, settingsError } = useSettings();
  const optionBackground = colorScheme === 'dark' ? theme.background : theme.backgroundElement;
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, { paddingTop: Math.max(47, insets.top) }]}>
        <GameScreenHeader title="Settings" fontsLoaded={appearanceTheme.fontsLoaded} />
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
        style={[styles.sheet, { backgroundColor: colorScheme === 'dark' ? theme.backgroundElement : theme.background }]}
        contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Text accessibilityRole="header" style={[styles.heading, appearanceTheme.fontsLoaded && gameFonts.bold, { color: theme.text }]}>Appearance</Text>
          {(['system', 'light', 'dark'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`${value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'} appearance`}
              accessibilityState={{ selected: appearance === value }}
              onPress={() => setAppearance(value)}
              style={({ pressed }) => [styles.option, { backgroundColor: optionBackground }, pressed && { opacity: 0.75 }]}>
              <Text style={[styles.label, appearanceTheme.fontsLoaded && gameFonts.semibold, { color: theme.text }]}>
                {appearance === value ? '✓ ' : ''}{value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          ))}
          <Text accessibilityRole="header" style={[styles.heading, appearanceTheme.fontsLoaded && gameFonts.bold, { color: theme.text }]}>Scoring</Text>
          <View style={[styles.setting, { backgroundColor: optionBackground }]}>
            <Text style={[styles.label, appearanceTheme.fontsLoaded && gameFonts.semibold, { color: theme.text }]}>Allow negative scores</Text>
            <View style={styles.switchTarget}>
              <Switch accessibilityLabel="Allow negative scores" value={allowNegativeScores} onValueChange={setAllowNegativeScores} />
            </View>
          </View>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            You can always subtract points. When off, totals stop at 0. When on, totals can go below 0. Existing scores stay unchanged until you edit them.
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>Settings are saved on this device.</Text>
          {settingsError ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.text }]}>{settingsError}</Text> : null}
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheet: { flex: 1, marginTop: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  content: { flexGrow: 1, padding: 24 },
  form: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 12 },
  heading: { fontSize: 22, fontWeight: '700', marginTop: 12 },
  label: { fontSize: 18, fontWeight: '600', flexShrink: 1 },
  message: { fontSize: 16, lineHeight: 24 },
  option: { minHeight: 54, borderRadius: 12, padding: 16, justifyContent: 'center' },
  setting: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderRadius: 12 },
  switchTarget: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
});
