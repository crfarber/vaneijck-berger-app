import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshSVG } from '@/shared/ui/icons/refresh';
import { colors, spacing } from '@/shared/ui/theme';

/** Dark strip with the signed-in berger's name and login type; tap refreshes the worker record. */
export function SettingsWorkerBar({
  name,
  userTypeLabel,
  refreshing,
  onRefresh,
  accessibilityLabel,
}: {
  name: string;
  userTypeLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onRefresh}
      disabled={refreshing}
      style={({ pressed }) => [styles.row, pressed && !refreshing && styles.pressed]}
    >
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
      {refreshing ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <RefreshSVG size={20} color={colors.background} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.brandDark,
  },
  pressed: { opacity: 0.85 },
  details: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700', color: colors.background },
  userType: { fontSize: 12, color: colors.background },
});
