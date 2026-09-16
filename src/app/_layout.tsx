import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { GameProvider } from '@/context/game-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

// Keep Home behind a screen when opening a route directly.
export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const colors = useTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <GameProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
            headerBackTitle: 'Back',
          }}>
          <Stack.Screen name="index" options={{ title: 'Pointed', headerShown: false }} />
          <Stack.Screen name="new-game" options={{ title: 'New Game' }} />
          <Stack.Screen name="scoreboard" options={{ title: 'Scoreboard' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </GameProvider>
    </ThemeProvider>
  );
}
