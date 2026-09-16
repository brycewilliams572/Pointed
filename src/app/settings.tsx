import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { appearance, setAppearance, allowNegativeScores, setAllowNegativeScores } = useSettings();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Settings" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={[styles.option, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.label, { color: theme.text }]}>Done</Text>
          </Pressable>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Appearance</Text>
          {(['system', 'light', 'dark'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`${value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'} appearance`}
              accessibilityState={{ selected: appearance === value }}
              onPress={() => setAppearance(value)}
              style={({ pressed }) => [styles.option, { backgroundColor: theme.backgroundElement }, pressed && { opacity: 0.75 }]}>
              <Text style={[styles.label, { color: theme.text }]}>
                {appearance === value ? '✓ ' : ''}{value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          ))}
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Scoring</Text>
          <View style={[styles.setting, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.label, { color: theme.text }]}>Allow negative scores</Text>
            <View style={styles.switchTarget}>
              <Switch accessibilityLabel="Allow negative scores" value={allowNegativeScores} onValueChange={setAllowNegativeScores} />
            </View>
          </View>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            You can always subtract points. When off, totals stop at 0. When on, totals can go below 0. Existing scores stay unchanged until you edit them.
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>Settings reset when the app fully reloads.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24 },
  form: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 12 },
  heading: { fontSize: 22, fontWeight: '700', marginTop: 12 },
  label: { fontSize: 18, fontWeight: '600', flexShrink: 1 },
  message: { fontSize: 16, lineHeight: 24 },
  option: { minHeight: 48, borderRadius: 12, padding: 16, justifyContent: 'center' },
  setting: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderRadius: 12 },
  switchTarget: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
});
