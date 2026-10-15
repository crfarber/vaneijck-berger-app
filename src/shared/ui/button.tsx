import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from './theme';
import { useGuardedPress } from './use-guarded-press';

type ButtonVariant = 'primary' | 'secondary' | 'action' | 'danger' | 'light' | 'ghost' | 'text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Light tap haptic on accepted press. Default true. */
  haptic?: boolean;
  style?: ViewStyle;
};

const VARIANT_STYLE = {
  primary: 'primary',
  secondary: 'secondary',
  action: 'action',
  danger: 'danger',
  light: 'light',
  ghost: 'ghost',
  text: 'text',
} as const satisfies Record<ButtonVariant, ButtonVariant>;

const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: colors.brandText,
  secondary: colors.text,
  action: colors.brandLight,
  danger: colors.background,
  light: colors.text,
  ghost: colors.text,
  text: colors.brandAction,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  haptic = true,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  const handlePress = useGuardedPress({ onPress, disabled: inactive, haptic });

  if (variant === 'text') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.textButton,
          (pressed || inactive) && styles.textButtonDimmed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={SPINNER_COLOR.text} style={{ height: 20 }} />
        ) : (
          <Text style={styles.textButtonLabelUnderline}>{label}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        styles[VARIANT_STYLE[variant]],
        (pressed || inactive) && styles.dimmed,
        style,
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
            variant === 'ghost' && styles.ghostLabel,
            variant === 'action' && styles.actionLabel,
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
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.text },
  action: { backgroundColor: colors.brandAction },
  light: {
    backgroundColor: colors.buttonLight,
    borderRadius: radius.xxl,
    paddingVertical: spacing.lg,
  },
  dimmed: { opacity: 0.6 },
  label: { color: colors.brandText, fontSize: 16, fontWeight: '600' },
  secondaryLabel: { color: colors.text },
  dangerLabel: { color: colors.background },
  actionLabel: { color: colors.background, fontWeight: '700' },
  lightLabel: { color: colors.text, fontWeight: '700' },
  ghostLabel: { color: colors.text, fontWeight: '700' },
  textButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: undefined,
    borderRadius: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  textButtonDimmed: { opacity: 0.6 },
  textButtonLabel: {
    color: colors.brandAction,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  textButtonLabelUnderline: {
    color: colors.brandAction,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 0,
    paddingVertical: 0,
    textDecorationLine: 'underline',
  },
});
