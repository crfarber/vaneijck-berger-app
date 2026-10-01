import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from './theme';

const SIZE = 40;

type ToolbarButtonProps = {
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
  /** Red background (GPS off, unread, no permission). Default is brand secondary. */
  variant?: 'default' | 'alert' | 'success';
  /** Unread count or similar; shown as a badge in the top-right. */
  badge?: string | null;
  /** Set to use the button as a tab: brand background when true, announced as a tab. */
  selected?: boolean;
};

/**
 * Fixed-height icon button for the allocations toolbar. Width is filled by the parent slot
 * (`flex: 1` in the row), so four or five buttons share the screen evenly without hard-coded %.
 */
export function ToolbarButton({
  accessibilityLabel,
  onPress,
  children,
  variant = 'default',
  badge = null,
  selected,
}: ToolbarButtonProps) {
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'tab'}
      accessibilityState={selected === undefined ? undefined : { selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'alert' && styles.alert,
        variant === 'success' && styles.success,
        selected === true && styles.selected,
        pressed && styles.pressed,
      ]}
      hitSlop={spacing.xs}
    >
      {children}
      {badge !== null && badge !== '' ? (
        <View style={styles.badge} accessibilityElementsHidden>
          <Text style={styles.badgeText} allowFontScaling={false}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: SIZE,
    width: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  alert: { backgroundColor: colors.danger },
  success: { backgroundColor: colors.success },
  selected: { backgroundColor: colors.brand },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
