import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const isDark = colors.background === '#000000';
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
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
  const titleScale = Math.min(1, (width - insets.left - insets.right - 48) / 342);

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <Image
        source={require('../../assets/images/home/dot-pattern.svg')}
        contentFit="fill"
        accessible={false}
        pointerEvents="none"
        style={[styles.pattern, { width: width * (385.4866 / 390), height: height - 3 }]}
      />
      <SafeAreaView edges={['left', 'right']} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, {
          minHeight: height,
          paddingTop: contentInset,
          paddingBottom: contentInset,
        }]}>
          <View style={styles.home}>
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
        <View style={[styles.toolbar, { top: toolbarTop }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Opens the Settings screen."
            onPress={() => router.navigate('/settings')}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
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
  home: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 16,
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
