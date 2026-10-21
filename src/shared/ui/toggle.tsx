import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, type } from './theme';

type ToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label?: string;
  labelAction?: React.ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Marks the control as invalid (red label) without requiring error copy. */
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Toggle({
  value,
  onValueChange,
  label,
  labelAction,
  accessibilityLabel,
  disabled = false,
  invalid = false,
  style,
}: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        styles.row,
        style,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {label ? (
        <View style={styles.labelContainer}>
          <Text style={[type.label, styles.label, invalid && styles.labelError]}>{label}</Text>
          {labelAction ? labelAction : null}
        </View>
      ) : null}
      <View style={[styles.track, value && styles.trackOn, invalid && styles.trackError]}>
        <View style={[styles.thumb, value && styles.thumbOn]} />
      </View>
    </Pressable>
  );
}

const TRACK_W = 48;
const TRACK_H = 28;
const THUMB = 22;
const PAD = 4;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
  },
  labelContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    flex: 1,
  },
  label: { color: colors.text },
  labelError: { color: colors.danger },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: PAD,
  },
  trackOn: { backgroundColor: colors.text }, // ink
  trackError: { borderWidth: 1, borderColor: colors.danger },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
  },
  thumbOn: {
    backgroundColor: colors.brand, // yellow
    alignSelf: 'flex-end',
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
