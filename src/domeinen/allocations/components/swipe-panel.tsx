import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';

/** Full-height swipe action under a card (legacy `SwipeButton` layout). */
export function SwipePanel({
  label,
  icon,
  backgroundColor,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  backgroundColor: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.panel,
        { backgroundColor },
        (pressed || inactive) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <>
          {icon}
          <Text style={styles.panelLabel}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 104,
    height: '100%',
    minHeight: 150,
    marginLeft: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  panelLabel: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  dimmed: { opacity: 0.6 },
});
