import { BlurView } from 'expo-blur';
import { useContext, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBackgroundBlurContext } from './map-background';
import { screenFooterBackground } from './screen-footer-background';
import { colors, spacing } from './theme';

/**
 * Sticky action bar with a non-interactive blur behind its content and bottom safe area.
 * Screens without this footer keep a transparent SafeAreaView edge instead.
 */
export function ScreenFooter({
  children,
  backgroundColor = 'transparent',
}: {
  children: ReactNode;
  backgroundColor?: string;
}) {
  const insets = useSafeAreaInsets();
  const backgroundTarget = useContext(MapBackgroundBlurContext);
  const blurTarget = backgroundColor === 'transparent' ? backgroundTarget : undefined;

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: screenFooterBackground(backgroundColor, Platform.OS),
          paddingBottom: spacing.md + insets.bottom,
        },
      ]}
    >
      <BlurView
        pointerEvents="none"
        intensity={35}
        tint="light"
        blurTarget={blurTarget}
        blurMethod={blurTarget ? 'dimezisBlurView' : 'none'}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
