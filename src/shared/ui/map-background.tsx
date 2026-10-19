import { BlurTargetView } from 'expo-blur';
import { createContext, useRef, type ReactNode, type RefObject } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

import mapBackground from '@/assets/images/background.jpg';
import { colors } from './theme';

export const MapBackgroundBlurContext = createContext<RefObject<View | null> | undefined>(
  undefined,
);

/** Default faded street-map behind app screens (legacy background.jpg). */
export function MapBackground({ children }: { children: ReactNode }) {
  const blurTarget = useRef<View>(null);

  return (
    <MapBackgroundBlurContext.Provider value={blurTarget}>
      <View style={styles.root}>
        <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill} pointerEvents="none">
          <ImageBackground source={mapBackground} style={styles.root} resizeMode="cover" />
        </BlurTargetView>
        {children}
      </View>
    </MapBackgroundBlurContext.Provider>
  );
}

/**
 * Stack `screenLayout` that gives every screen its own opaque map background. A single background
 * behind a transparent stack lets the previous screen show through during the push animation.
 */
export function mapBackgroundScreenLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const styles = StyleSheet.create({
  // Close to the map's own tone, so nothing shows through before the image has decoded.
  root: { flex: 1, backgroundColor: colors.surface },
});
