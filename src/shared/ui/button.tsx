import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'light';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
};

const VARIANT_STYLE = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  light: 'light',
} as const satisfies Record<ButtonVariant, ButtonVariant>;

const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: colors.brandText,
  secondary: colors.text,
  danger: colors.background,
  light: colors.text,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[VARIANT_STYLE[variant]],
        (pressed || inactive) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLOR[variant]} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' && styles.secondaryLabel,
            variant === 'danger' && styles.dangerLabel,
            variant === 'light' && styles.lightLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  light: {
    backgroundColor: colors.buttonLight,
    borderRadius: radius.xxl,
    paddingVertical: spacing.lg,
  },
  dimmed: { opacity: 0.6 },
  label: { color: colors.brandText, fontSize: 16, fontWeight: '600' },
  secondaryLabel: { color: colors.text },
  dangerLabel: { color: colors.background },
  lightLabel: { color: colors.text, fontWeight: '700' },
});
