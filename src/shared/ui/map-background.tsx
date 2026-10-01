import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

import mapBackground from '@/assets/images/background.jpg';
import { colors } from './theme';

/** Default faded street-map behind app screens (legacy background.jpg). */
export function MapBackground({ children }: { children: ReactNode }) {
  return (
    <ImageBackground source={mapBackground} style={styles.root} resizeMode="cover">
      {children}
    </ImageBackground>
  );
}

/**
 * Stack `screenLayout` that gives every screen its own opaque map background. A single background
 * behind a transparent stack lets the previous screen show through during the push animation.
 */
export function mapBackgroundScreenLayout({ children }: { children: ReactNode }) {
  return <MapBackground>{children}</MapBackground>;
}

const styles = StyleSheet.create({
  // Close to the map's own tone, so nothing shows through before the image has decoded.
  root: { flex: 1, backgroundColor: colors.surface },
});
