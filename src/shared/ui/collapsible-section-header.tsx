import { Pressable, StyleSheet, Text } from 'react-native';
import { ChevronIcon } from './icons/chevron';
import { colors, radius, spacing, type } from './theme';

type CollapsibleSectionHeaderProps = {
  title: string;
  collapsed: boolean;
  onPress: () => void;
};

export function CollapsibleSectionHeader({
  title,
  collapsed,
  onPress,
}: CollapsibleSectionHeaderProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={({ pressed }) => [styles.header, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{title}</Text>
      <ChevronIcon direction={collapsed ? 'down' : 'up'} size={18} color={colors.brandLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    marginVertical: spacing.sm,
    gap: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brandDark,
    borderRadius: radius.md,
  },
  pressed: { opacity: 0.6 },
  title: {
    ...type.label,
    fontWeight: type.label.fontWeight,
    color: colors.brandLight,
  },
});
