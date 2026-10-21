import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GPS_STATUS } from '@/domeinen/location';
import type { GpsStatusState } from '@/domeinen/location/ui';
import { colors, radius, spacing, type } from '@/shared/ui/theme';
import { formatInstantTime } from '@/shared/utils/time';

type MapGpsBannerProps = {
  gps: GpsStatusState;
  visible: boolean;
  onPress: () => void;
};

/**
 * Compact live-GPS strip at the bottom of the allocations map. Hidden while an assignment sheet
 * is open; tap opens the full GPS status sheet. While a fix is loading, a spinner shows and the
 * previous coordinate / last-update text stay visible.
 */
export function MapGpsBanner({ gps, visible, onPress }: MapGpsBannerProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  if (!visible) {
    return null;
  }

  const statusLabel =
    gps.status === GPS_STATUS.active ? t('location.active') : t('location.inactive');
  const coordinateLine =
    gps.coordinate !== null
      ? `${gps.coordinate.latitude.toFixed(5)}, ${gps.coordinate.longitude.toFixed(5)}`
      : t('allocations.map.gpsNoFix');
  const updateLine =
    gps.lastUpdatedAt !== null
      ? t('location.lastUpdate', { time: formatInstantTime(gps.lastUpdatedAt, locale) })
      : null;

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('allocations.map.gpsBanner')}
        accessibilityState={{ busy: gps.refreshing }}
        onPress={onPress}
        style={({ pressed }) => [styles.banner, pressed ? styles.pressed : null]}
      >
        <View
          style={[
            styles.dot,
            gps.status === GPS_STATUS.active || gps.status === GPS_STATUS.noFix
              ? styles.dotOk
              : styles.dotAlert,
          ]}
        />
        <View style={styles.textCol}>
          <Text style={styles.title}>{statusLabel}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {coordinateLine}
          </Text>
          {updateLine !== null ? (
            <Text style={styles.meta} numberOfLines={1}>
              {updateLine}
            </Text>
          ) : null}
        </View>
        {gps.refreshing ? (
          <ActivityIndicator
            accessibilityLabel={t('common.loading')}
            color={colors.brandAction}
            size="small"
          />
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.85 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOk: { backgroundColor: colors.success },
  dotAlert: { backgroundColor: colors.danger },
  textCol: { flex: 1, gap: 2 },
  title: { ...type.label, color: colors.text },
  meta: { ...type.small, color: colors.textMuted },
});
