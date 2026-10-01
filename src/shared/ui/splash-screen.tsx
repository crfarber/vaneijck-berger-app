import { Image, StyleSheet, View } from 'react-native';

import trucksBackground from '@/assets/images/trucks-background.png';
import splashGrid from '@/assets/images/splash-grid.png';
import { colors } from './theme';

const GRID_ASPECT_RATIO = 1080 / 709;

type SplashScreenViewProps = {
  /** Called once the view has a size, so the native splash can hide without a blank frame. */
  onLayout?: () => void;
};

/**
 * Launch splash: trucks photo, yellow wash, dark wash, checker grid at the bottom.
 * Native expo-splash-screen can only do a solid color; this view is the real brand splash.
 */
export function SplashScreenView({ onLayout }: SplashScreenViewProps) {
  return (
    <View style={styles.root} onLayout={onLayout}>
      <Image source={trucksBackground} style={styles.background} resizeMode="cover" />
      <View style={styles.yellowOverlay} />
      <View style={styles.darkOverlay} />
      <Image source={splashGrid} style={styles.grid} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brand,
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  yellowOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    backgroundColor: colors.brand,
    opacity: 0.58,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    backgroundColor: colors.brandDark,
    opacity: 0.2,
  },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    width: '100%',
    aspectRatio: GRID_ASPECT_RATIO,
  },
});
