import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from './theme';
import { useGuardedPress } from './use-guarded-press';

const SIZE = 40;

type ToolbarButtonProps = {
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
  /** Red glass background (GPS off, unread, no permission). Default is brand secondary. */
  variant?: 'default' | 'alert' | 'success';
  /** Unread count or similar; shown as a badge in the top-right. */
  badge?: string | null;
  /** Set to use the button as a tab: brand background when true, announced as a tab. */
  selected?: boolean;
  /** Light tap haptic on accepted press. Default true. */
  haptic?: boolean;
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
  haptic = true,
}: ToolbarButtonProps) {
  const handlePress = useGuardedPress({ onPress, haptic });

  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'tab'}
      accessibilityState={selected === undefined ? undefined : { selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        variant === 'success' && styles.success,
        variant === 'alert' && styles.alert,
        selected === true && styles.selected,
        pressed && styles.pressed,
      ]}
      hitSlop={spacing.xs}
    >
      <View pointerEvents="none" style={styles.glass}>
        <BlurView
          pointerEvents="none"
          intensity={35}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      </View>
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
    borderRadius: radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: colors.brandDark,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.025)',
  },
  glass: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  defaultTint: { backgroundColor: colors.brandDark },
  alert: { backgroundColor: `${colors.danger}BF` },
  success: { backgroundColor: `${colors.success}BF` },
  selected: { backgroundColor: `${colors.brand}BF` },
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
