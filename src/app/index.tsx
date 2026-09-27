import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const isDark = colors.background === '#000000';
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  // Static rendering reports zero dimensions before a browser viewport exists.
  // Use the design viewport for that pass so the exported HTML remains usable
  // and hydrates without invalid negative font/image sizes.
  const viewportWidth = width > 0 ? width : 390;
  const viewportHeight = height > 0 ? height : 844;
  const [fontsLoaded] = useFonts({
    'Home-Jaro': require('../../assets/fonts/home/Jaro.ttf'),
    'Home-JockeyOne': require('../../assets/fonts/home/JockeyOne-Regular.ttf'),
    'Home-Inter': require('../../assets/fonts/home/Inter-SemiBold.ttf'),
  });
  const background = isDark ? '#1F1E4D' : colors.background;
  const foreground = isDark ? colors.text : '#1F1E4D';
  const buttonBackground = isDark ? colors.text : colors.backgroundElement;
  const interfaceFont = fontsLoaded ? styles.interfaceFont : undefined;
  const toolbarTop = Math.max(140, insets.top + 8);
  // Balance padding around the actions to retain Figma's full-screen centering.
  // On short screens or with large text, the content can grow and scroll.
  const contentInset = Math.max(toolbarTop + 80, insets.bottom + 24);
  const titleWidth = Platform.OS === 'web' ? 430 : 342;
  const titleScale = Math.max(0.7, Math.min(1, (viewportWidth - insets.left - insets.right - 48) / titleWidth));

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <Image
        source={require('../../assets/images/home/dot-pattern.svg')}
        contentFit="fill"
        accessible={false}
        pointerEvents="none"
        style={[styles.pattern, { width: viewportWidth * (385.4866 / 390), height: viewportHeight - 3 }]}
      />
      <SafeAreaView edges={['left', 'right']} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, Platform.OS === 'web' && styles.webContent, {
          minHeight: viewportHeight,
          paddingTop: contentInset,
          paddingBottom: contentInset,
        }]}>
          <View style={[
            styles.home,
            Platform.OS === 'web' && styles.webHome,
            Platform.OS === 'web' && { width: Math.max(272, Math.min(440, viewportWidth - 48)) },
          ]}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={[
                styles.title,
                fontsLoaded && styles.titleFont,
                { color: foreground, fontSize: 96 * titleScale, lineHeight: 120 * titleScale },
              ]}>
                Pointed
              </Text>
              <Text style={[
                styles.subtitle,
                fontsLoaded && styles.subtitleFont,
                { color: foreground },
              ]}>
                Score Anything
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New Game"
              accessibilityHint="Opens the New Game screen."
              onPress={() => router.navigate('/new-game')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: buttonBackground },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.buttonLabel, interfaceFont, styles.buttonText]}>New Game</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue Game"
              accessibilityHint="Opens Saved Games."
              onPress={() => router.navigate('/games')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: buttonBackground },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.buttonLabel, interfaceFont, styles.buttonText]}>Continue Game</Text>
            </Pressable>
          </View>
        </ScrollView>
        <View style={[styles.toolbar, Platform.OS === 'web' && styles.webToolbar, { top: toolbarTop }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Opens the Settings screen."
            onPress={() => router.navigate('/settings')}
            style={({ pressed }) => [styles.settingsButton, Platform.OS === 'web' && styles.webSettingsButton, pressed && styles.pressed]}>
            <Text style={[styles.settingsLabel, interfaceFont, { color: foreground }]}>Settings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  pattern: {
    position: 'absolute',
    top: 3,
    left: 2,
  },
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 2,
  },
  webToolbar: {
    paddingHorizontal: 0,
  },
  settingsButton: {
    minHeight: 48,
    minWidth: 97,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  webSettingsButton: {
    marginRight: 16,
  },
  settingsLabel: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  webContent: {
    paddingHorizontal: 0,
  },
  home: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 16,
  },
  webHome: {
    maxWidth: 440,
  },
  heading: {
    alignItems: 'center',
    paddingBottom: 43,
  },
  title: {
    fontSize: 96,
    lineHeight: 120,
    marginBottom: -11,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 25,
    textAlign: 'center',
  },
  titleFont: {
    fontFamily: 'Home-Jaro',
  },
  subtitleFont: {
    fontFamily: 'Home-JockeyOne',
  },
  interfaceFont: {
    fontFamily: 'Home-Inter',
    fontWeight: '400',
  },
  button: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 9,
    boxShadow: '5px 5px 0px #2E618C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonText: {
    color: '#1F1E4D',
  },
  pressed: {
    opacity: 0.75,
  },
});
