import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from './icons/chevron';
import { colors, radius, spacing, type } from './theme';

type CollapsibleSectionHeaderProps = {
  title: string;
  count?: number | string;
  collapsed: boolean;
  onPress: () => void;
};

export function CollapsibleSectionHeader({
  title,
  count,
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
      <BlurView pointerEvents="none" intensity={15} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        {count !== undefined && (
          <View style={styles.countContainer}>
            <Text style={styles.count}>{count}</Text>
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.countContainer}>
        <ChevronIcon direction={collapsed ? 'down' : 'up'} size={18} color={colors.brandLight} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    marginVertical: spacing.sm,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.brandDark,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.025)',
  },
  countContainer: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 28,
    minHeight: 28,
  },
  count: {
    ...type.label,
    color: colors.brandLight,
  },
  pressed: { opacity: 0.6 },
  title: {
    ...type.label,
    color: colors.brandLight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
});
