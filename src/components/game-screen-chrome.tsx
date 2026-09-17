import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// Opt-in presentation for New Game and Scoreboard Grid, not global theme tokens.
export function useGameScreenAppearance() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({
    'Game-Inter': require('../../assets/fonts/game/Inter-400Regular.ttf'),
    'Game-Inter-SemiBold': require('../../assets/fonts/home/Inter-SemiBold.ttf'),
    'Game-Inter-Bold': require('../../assets/fonts/game/Inter-700Bold.ttf'),
  });
  return {
    ...theme,
    background: theme.background === '#000000' ? '#1F1E4D' : theme.background,
    buttonBackground: theme.background === '#000000' ? '#FFFFFF' : theme.backgroundElement,
    buttonText: '#1F1E4D',
    fontsLoaded,
  };
}

export const gameFonts = StyleSheet.create({
  regular: { fontFamily: 'Game-Inter', fontWeight: '400' },
  semibold: { fontFamily: 'Game-Inter-SemiBold', fontWeight: '400' },
  bold: { fontFamily: 'Game-Inter-Bold', fontWeight: '400' },
});

export function GameScreenBackground() {
  const { width, height } = useWindowDimensions();
  return <Image source={require('../../assets/images/game/dot-pattern.svg')} accessible={false}
    contentFit="fill" style={{ position: 'absolute', top: 3, left: 2, width: width * (385.4866 / 390), height: height - 3, pointerEvents: 'none' }} />;
}

export function GameScreenHeader({ title, settings = false, fontsLoaded }: { title: string; settings?: boolean; fontsLoaded: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  return <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.headerAction}>
      <Text style={[styles.headerLabel, fontsLoaded && gameFonts.regular, { color: theme.text }]}>‹ Back</Text>
    </Pressable>
    <Text accessibilityRole="header" numberOfLines={1} style={[styles.headerTitle, fontsLoaded && gameFonts.semibold, { color: theme.text }]}>{title}</Text>
    {settings ? <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={styles.headerAction}>
      <Text style={[styles.headerLabel, fontsLoaded && gameFonts.regular, { color: theme.text }]}>Settings</Text>
    </Pressable> : <View style={styles.headerAction} />}
  </View>;
}

const styles = StyleSheet.create({
  header: { marginHorizontal: 21, minHeight: 44, borderRadius: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  headerAction: { minHeight: 44, minWidth: 70, justifyContent: 'center', alignItems: 'center' },
  headerLabel: { fontSize: 17, lineHeight: 21 },
  headerTitle: { flex: 1, fontSize: 17, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
});
