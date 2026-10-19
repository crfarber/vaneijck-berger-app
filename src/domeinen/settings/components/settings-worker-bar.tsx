import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshSVG } from '@/shared/ui/icons/refresh';
import { UserIcon } from '@/shared/ui/icons/user';
import { colors, radius, spacing } from '@/shared/ui/theme';

/**
 * Dark strip with the signed-in berger's name and login type.
 * Identity (avatar + name) can register secret taps; the refresh control reloads the worker.
 */
export function SettingsWorkerBar({
  name,
  userTypeLabel,
  refreshing,
  onRefresh,
  onIdentityPress,
  accessibilityLabel,
  identityAccessibilityLabel,
}: {
  name: string;
  userTypeLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
  onIdentityPress?: () => void;
  accessibilityLabel: string;
  identityAccessibilityLabel?: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={identityAccessibilityLabel ?? name}
        onPress={onIdentityPress}
        style={({ pressed }) => [
          styles.identity,
          onIdentityPress !== undefined && pressed && styles.pressed,
        ]}
      >
        <View style={styles.avatar} accessibilityElementsHidden>
          <UserIcon size={20} color={colors.background} />
        </View>
        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {userTypeLabel !== '' ? (
            <Text style={styles.userType} numberOfLines={1}>
              {userTypeLabel}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onRefresh}
        disabled={refreshing}
        hitSlop={spacing.sm}
        style={({ pressed }) => [styles.refresh, pressed && !refreshing && styles.pressed]}
      >
        {refreshing ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <RefreshSVG size={20} color={colors.background} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.brandDark,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  refresh: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: colors.background },
  userType: { fontSize: 12, color: colors.background },
});
