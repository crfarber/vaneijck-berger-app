import { BlurView } from 'expo-blur';
import { useContext, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MapBackgroundBlurContext } from './map-background';
import { colors, radius } from './theme';

/** Card with the same frosted glass as the screen footer. */
export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const blurTarget = useContext(MapBackgroundBlurContext);

  return (
    <View style={[styles.card, style]}>
      <BlurView
        pointerEvents="none"
        intensity={10}
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
  card: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
