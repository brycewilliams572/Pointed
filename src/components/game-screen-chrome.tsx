import { useFonts } from 'expo-font';
import { Image, type ImageSource } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export const arcadeColors = {
  navy: '#1F1E4D',
  panel: '#212225',
  panelRaised: '#292A2E',
  panelSoft: '#34353B',
  ink: '#000000',
  white: '#FFFFFF',
  muted: '#B0B4BA',
  yellow: '#FFC72C',
  scoreWell: '#17181B',
} as const;

export function useGameScreenAppearance() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({
    'Game-Inter': require('../../assets/fonts/game/Inter-400Regular.ttf'),
    'Game-Inter-SemiBold': require('../../assets/fonts/home/Inter-SemiBold.ttf'),
    'Game-Inter-Bold': require('../../assets/fonts/game/Inter-700Bold.ttf'),
    'Game-ArchivoBlack': require('../../assets/fonts/home/ArchivoBlack-Regular.ttf'),
  });
  return { ...theme, buttonBackground: arcadeColors.yellow, buttonText: arcadeColors.ink, fontsLoaded };
}

export const gameFonts = StyleSheet.create({
  regular: { fontFamily: 'Game-Inter', fontWeight: '400' },
  semibold: { fontFamily: 'Game-Inter-SemiBold', fontWeight: '400' },
  bold: { fontFamily: 'Game-Inter-Bold', fontWeight: '400' },
  display: { fontFamily: 'Game-ArchivoBlack', fontWeight: '400' },
});

export function GameScreenBackground() {
  return <View pointerEvents="none" style={styles.background} />;
}

type HeaderAction = {
  label?: string;
  accessibilityLabel: string;
  icon?: ImageSource;
  onPress: () => void;
};

export function GameScreenHeader({
  title,
  subtitle,
  backLabel = 'Back',
  onBack,
  trailing,
  trailingLabel,
  trailingAccessibilityLabel,
  onTrailingPress,
  fontsLoaded,
}: {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  trailing?: HeaderAction[];
  settings?: boolean;
  trailingLabel?: string;
  trailingAccessibilityLabel?: string;
  onTrailingPress?: () => void;
  fontsLoaded: boolean;
}) {
  const router = useRouter();
  const actions = trailing ?? (trailingLabel || onTrailingPress ? [{
    label: trailingLabel ?? 'Settings',
    accessibilityLabel: trailingAccessibilityLabel ?? trailingLabel ?? 'Settings',
    onPress: onTrailingPress ?? (() => router.push('/settings')),
  }] : []);
  const goBack = onBack ?? (() => router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${backLabel}`} onPress={goBack}
        style={({ pressed }) => [styles.backAction, pressed && styles.pressed]}>
        <Text numberOfLines={1} style={[styles.backLabel, fontsLoaded && gameFonts.display]}>‹ {backLabel}</Text>
      </Pressable>
      <View pointerEvents="none" style={styles.titleStack}>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.headerTitle, fontsLoaded && gameFonts.display]}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={[styles.subtitle, fontsLoaded && gameFonts.bold]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.trailing}>
        {actions.map((action, index) => (
          <Pressable key={`${action.accessibilityLabel}-${index}`} accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel} onPress={action.onPress}
            style={({ pressed }) => [action.icon ? styles.iconAction : styles.textAction, pressed && styles.pressed]}>
            {action.icon ? <Image source={action.icon} accessible={false} contentFit="contain" style={styles.headerIcon} /> :
              <Text numberOfLines={1} style={[styles.trailingLabel, fontsLoaded && gameFonts.display]}>{action.label}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ArcadeButton({
  label,
  onPress,
  accessibilityLabel = label,
  icon,
  variant = 'primary',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  icon?: ImageSource;
  variant?: 'primary' | 'light' | 'dark';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { fontsLoaded } = useGameScreenAppearance();
  const backgroundColor = variant === 'primary' ? arcadeColors.yellow : variant === 'light' ? arcadeColors.white : arcadeColors.panelRaised;
  const color = variant === 'dark' ? arcadeColors.white : arcadeColors.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor, opacity: disabled ? 0.42 : 1 }, style, pressed && styles.pressed]}>
      {icon ? <Image source={icon} accessible={false} contentFit="contain" style={styles.buttonIcon} /> : null}
      <Text numberOfLines={1} style={[styles.buttonLabel, fontsLoaded && gameFonts.display, { color }]}>{label}</Text>
    </Pressable>
  );
}

export const arcadeSurface: ViewStyle = {
  borderWidth: 4,
  borderColor: arcadeColors.ink,
  borderRadius: 0,
  boxShadow: '5px 5px 0px #000000',
};

const styles = StyleSheet.create({
  background: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: arcadeColors.navy },
  header: {
    width: '100%', maxWidth: 342, height: 44, alignSelf: 'center', backgroundColor: arcadeColors.panel,
    borderWidth: 4, borderColor: arcadeColors.ink, boxShadow: '5px 5px 0px #000000',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6,
  },
  backAction: { width: 92, minHeight: 36, justifyContent: 'center', paddingHorizontal: 4, zIndex: 2 },
  backLabel: { color: arcadeColors.white, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  titleStack: { position: 'absolute', left: 96, right: 96, top: 4, bottom: 4, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: arcadeColors.white, fontSize: 17, lineHeight: 18, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: arcadeColors.muted, fontSize: 8, lineHeight: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  trailing: { marginLeft: 'auto', minWidth: 64, flexDirection: 'row', gap: 4, justifyContent: 'flex-end', alignItems: 'center' },
  iconAction: { width: 26, height: 26, borderWidth: 2, borderColor: arcadeColors.ink, backgroundColor: arcadeColors.panelSoft, alignItems: 'center', justifyContent: 'center' },
  textAction: { minWidth: 58, minHeight: 34, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 3 },
  trailingLabel: { color: arcadeColors.yellow, fontSize: 11, lineHeight: 14, fontWeight: '900' },
  headerIcon: { width: 14, height: 14 },
  button: { minHeight: 48, borderWidth: 4, borderColor: arcadeColors.ink, borderRadius: 0, boxShadow: '5px 5px 0px #000000', flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  buttonIcon: { width: 17, height: 17 },
  buttonLabel: { fontSize: 13, lineHeight: 16, fontWeight: '900' },
  pressed: { opacity: 0.72, transform: [{ translateX: 1 }, { translateY: 1 }] },
});
