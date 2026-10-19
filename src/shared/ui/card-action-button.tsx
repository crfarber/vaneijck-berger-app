import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { colors, radius, spacing } from './theme';

/** Blue icon tile plus dark label — same shape on cards and banners. */
export function CardActionButton({
  label,
  icon,
  onPress,
  variant = 'default',
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'default' | 'success';
}) {
  const backgroundColor = variant === 'success' ? colors.success : colors.brandDark;
  const iconBackgroundColor = variant === 'success' ? colors.success : colors.brandAction;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={12}
      style={[styles.actionButton, { backgroundColor }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={18} color={colors.surface} />
      </View>
      <View style={[styles.actionLabel]}>
        <Text style={[styles.actionText]}>{label.toUpperCase()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  actionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radius.xxl,
    borderBottomLeftRadius: radius.xxl,
  },
  actionLabel: {
    height: 30,
    paddingRight: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderTopRightRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    backgroundColor: colors.brandDark,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surface,
  },
});
