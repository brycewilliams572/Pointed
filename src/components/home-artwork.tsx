import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  fontsLoaded: boolean;
  scale: number;
};

export function HomeArtwork({ fontsLoaded, scale }: Props) {
  const s = (value: number) => value * scale;

  return (
    <View style={[styles.canvas, { width: s(390), height: s(560) }]}>
      <Image
        source={require('../../assets/images/home/figma-start/vector-square.svg')}
        accessible={false}
        contentFit="fill"
        style={[styles.asset, { left: s(20.4725), top: s(350), width: s(390), height: s(120) }]}
      />

      <View style={[styles.centeredLayer, {
        left: s(29.4341),
        top: s(144.771),
        width: s(326.6482),
        height: s(377.2433),
      }]}>
        <View style={[styles.panel, {
          width: s(280),
          height: s(340),
          borderWidth: s(6),
          transform: [{ rotate: '-8.4deg' }],
        }]} />
      </View>

      <View style={[styles.asset, {
        left: s(39.4725),
        top: s(360),
        width: s(266),
        height: s(80),
      }]}>
        <View style={[styles.titleBackground, { borderWidth: s(5) }]} />
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1}
          style={[
            styles.title,
            fontsLoaded && styles.archivo,
            {
              left: s(12),
              top: s(10),
              fontSize: s(48),
              lineHeight: s(52),
            },
          ]}>
          POINTED
        </Text>
      </View>

      <View style={[styles.asset, {
        left: s(159.4725),
        top: s(440),
        width: s(200),
        height: s(40),
      }]}>
        <Image
          source={require('../../assets/images/home/figma-start/tagline-bg.svg')}
          accessible={false}
          contentFit="fill"
          style={{ width: s(193.5), height: s(40) }}
        />
        <Text
          maxFontSizeMultiplier={1}
          style={[
            styles.tagline,
            fontsLoaded && styles.geist,
            {
              left: s(16),
              top: s(10),
              fontSize: s(13),
              lineHeight: s(17),
            },
          ]}>
          SCORE ANYTHING
        </Text>
      </View>

      <View style={[styles.centeredLayer, {
        left: s(7),
        top: s(165.42),
        width: s(269.8676),
        height: s(203.5692),
      }]}>
        <Image
          source={require('../../assets/images/home/figma-start/chessboard-black.svg')}
          accessible={false}
          contentFit="fill"
          style={{
            width: s(240.13),
            height: s(146.21),
            transform: [{ rotate: '-15.06deg' }],
          }}
        />
      </View>

      <Image
        source={require('../../assets/images/home/figma-start/chessboard.svg')}
        accessible={false}
        contentFit="fill"
        style={[styles.asset, {
          left: s(23.5332),
          top: s(189.0278),
          width: s(232.953),
          height: s(142.733),
        }]}
      />

      <Image
        source={require('../../assets/images/home/figma-start/card-shadow-a.svg')}
        accessible={false}
        contentFit="fill"
        style={[styles.asset, {
          left: s(249.0431),
          top: s(228),
          width: s(89.168),
          height: s(118.996),
        }]}
      />

      <View style={[styles.centeredLayer, {
        left: s(265.23),
        top: s(220.8547),
        width: s(116.8112),
        height: s(142.6897),
      }]}>
        <Image
          source={require('../../assets/images/home/figma-start/card-shadow-b.svg')}
          accessible={false}
          contentFit="fill"
          style={{
            width: s(89.6568),
            height: s(126.24),
            transform: [{ rotate: '15deg' }],
          }}
        />
      </View>

      <Image
        source={require('../../assets/images/home/figma-start/card-a.svg')}
        accessible={false}
        contentFit="fill"
        style={[styles.asset, {
          left: s(249.043),
          top: s(227.0378),
          width: s(88.5504),
          height: s(116.192),
        }]}
      />

      <View style={[styles.centeredLayer, {
        left: s(266.07),
        top: s(220.8547),
        width: s(112.4008),
        height: s(137.3022),
      }]}>
        <Image
          source={require('../../assets/images/home/figma-start/card-b.svg')}
          accessible={false}
          contentFit="fill"
          style={{
            width: s(88.3627),
            height: s(123.549),
            transform: [{ rotate: '15deg' }],
          }}
        />
      </View>

      <Image
        source={require('../../assets/images/home/figma-start/die-shadow.svg')}
        accessible={false}
        contentFit="fill"
        style={[styles.asset, {
          left: s(197.4725),
          top: s(107),
          width: s(92),
          height: s(95),
        }]}
      />

      <Image
        source={require('../../assets/images/home/figma-start/die.svg')}
        accessible={false}
        contentFit="fill"
        style={[styles.asset, {
          left: s(198.9302),
          top: s(102.5037),
          width: s(91.4735),
          height: s(95.1239),
        }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'relative',
    overflow: 'visible',
    pointerEvents: 'none',
  },
  asset: {
    position: 'absolute',
  },
  centeredLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: '#FFC72C',
    borderColor: '#000000',
  },
  titleBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  },
  title: {
    position: 'absolute',
    color: '#1F1E4D',
    fontWeight: '900',
    includeFontPadding: false,
  },
  tagline: {
    position: 'absolute',
    color: '#FFC72C',
    fontWeight: '900',
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
});
