import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from './theme';

/**
 * Sticky action bar that owns the bottom safe area: white fills to the home
 * indicator so the map background does not peek underneath. Screens without
 * this footer keep a transparent SafeAreaView edge instead.
 */
export function ScreenFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
