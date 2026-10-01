import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '@/shared/ui/icons/chevron';
import { colors, spacing } from '@/shared/ui/theme';

/** One row in the settings list: icon, label, chevron — same layout as the old app menu. */
export function SettingsMenuRow({
  label,
  icon,
  onPress,
  showDivider,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.leading}>{icon}</View>
        <Text style={styles.label}>{label}</Text>
        <ChevronIcon direction="right" size={22} color={colors.text} />
      </Pressable>
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.7 },
  leading: { width: 28, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
});
