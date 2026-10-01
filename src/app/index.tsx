import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeArtwork } from '@/components/home-artwork';

const DESIGN_WIDTH = 390;
const HERO_HEIGHT = 560;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const viewportWidth = width > 0 ? width : DESIGN_WIDTH;
  const availableWidth = Math.max(1, viewportWidth - insets.left - insets.right);
  const scale = Math.min(1, availableWidth / DESIGN_WIDTH);
  const canvasWidth = DESIGN_WIDTH * scale;
  const [fontsLoaded] = useFonts({
    'Home-ArchivoBlack': require('../../assets/fonts/home/ArchivoBlack-Regular.ttf'),
    'Home-GeistMonoBlack': require('../../assets/fonts/home/GeistMono-Black.ttf'),
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: HERO_HEIGHT * scale }]}>
          <View style={{ width: canvasWidth, height: HERO_HEIGHT * scale }}>
            <HomeArtwork fontsLoaded={fontsLoaded} scale={scale} />
            <View style={[styles.topActions, {
              left: 24 * scale,
              right: 24 * scale,
              top: Math.max(51 * scale, insets.top + 4),
              height: 45 * scale,
            }]}>
              <Text
                maxFontSizeMultiplier={1}
                style={[
                  styles.version,
                  fontsLoaded && styles.geist,
                  { fontSize: 14 * scale, lineHeight: 18 * scale },
                ]}>
                v1.0
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                accessibilityHint="Opens the Settings screen."
                hitSlop={8}
                onPress={() => router.navigate('/settings')}
                style={({ pressed }) => pressed && styles.pressed}>
                <Text
                  maxFontSizeMultiplier={1}
                  style={[
                    styles.settings,
                    fontsLoaded && styles.geist,
                    { fontSize: 16 * scale, lineHeight: 21 * scale },
                  ]}>
                  Settings
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.actionBlock, { marginTop: 52.75 * scale }]}>
          {renderHomeAction({
            label: 'New Game',
            accessibilityHint: 'Opens the New Game screen.',
            backgroundColor: '#FFC72C',
            fontsLoaded,
            onPress: () => router.navigate('/new-game'),
          })}
          {renderHomeAction({
            label: 'Continue Game',
            accessibilityHint: 'Opens Saved Games.',
            backgroundColor: '#FFFFFF',
            fontsLoaded,
            onPress: () => router.navigate('/games'),
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function renderHomeAction({
  label,
  accessibilityHint,
  backgroundColor,
  fontsLoaded,
  onPress,
}: {
  label: string;
  accessibilityHint: string;
  backgroundColor: string;
  fontsLoaded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor }, pressed && styles.pressed]}>
      <Text
        maxFontSizeMultiplier={1.4}
        style={[styles.buttonLabel, fontsLoaded && styles.archivo]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingBottom: 32,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#1F1E4D',
    overflow: 'hidden',
  },
  topActions: {
    position: 'absolute',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  version: {
    color: '#FFFFFF',
    fontWeight: '900',
    includeFontPadding: false,
  },
  settings: {
    color: '#FFFFFF',
    fontWeight: '900',
    textDecorationLine: 'underline',
    includeFontPadding: false,
  },
  actionBlock: {
    width: '100%',
    maxWidth: 390,
    paddingHorizontal: 24,
    gap: 16,
  },
  button: {
    width: '100%',
    height: 56,
    padding: 16,
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 0,
    boxShadow: '5px 5px 0px #000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: '#000000',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  archivo: {
    fontFamily: 'Home-ArchivoBlack',
    fontWeight: '400',
  },
  geist: {
    fontFamily: 'Home-GeistMonoBlack',
    fontWeight: '400',
  },
  pressed: {
    opacity: 0.75,
  },
});
