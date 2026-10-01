import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';

type AllocationCardFrameProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Shared surface only: presentation profiles decide what information fills its three regions. */
export function AllocationCardFrame({
  children,
  header,
  footer,
  onPress,
  accessibilityLabel,
}: AllocationCardFrameProps) {
  const mainContent = (
    <View style={styles.content}>
      {header ? <View style={styles.header}>{header}</View> : null}
      {children}
    </View>
  );

  return (
    <View style={styles.frame}>
      <View style={styles.body}>
        {onPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
          >
            {mainContent}
          </Pressable>
        ) : (
          <View style={styles.static}>{mainContent}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: colors.brand,
    borderRadius: radius.md,
  },
  body: { flex: 1 },
  pressable: { flex: 1 },
  static: { flex: 1 },
  pressed: { opacity: 0.78 },
  content: { padding: spacing.sm, gap: spacing.sm },
  header: { gap: spacing.xs },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
});
