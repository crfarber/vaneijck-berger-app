import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';

type PhotoPositionButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
};

export function PhotoPositionButton({ label, selected, onPress, icon }: PhotoPositionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        selected && styles.buttonSelected,
        pressed && styles.buttonPressed,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text numberOfLines={2} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  buttonSelected: {
    borderColor: colors.brandDark,
    borderWidth: 2,
    backgroundColor: colors.brandLight,
  },
  buttonPressed: { opacity: 0.7 },
  icon: { height: 26, justifyContent: 'center' },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
