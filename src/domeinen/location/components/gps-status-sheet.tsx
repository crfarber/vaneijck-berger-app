import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { colors, spacing } from '@/shared/ui/theme';
import { formatInstantTime } from '@/shared/utils/time';
import { GPS_STATUS } from '../domain/gps-status';
import { googleMapsSearchUrl } from '../domain/maps-url';
import type { GpsStatusState } from '../hooks/use-gps-status';

type GpsStatusSheetProps = {
  visible: boolean;
  onClose: () => void;
  gps: GpsStatusState;
};

/**
 * Bottom sheet with GPS status, coordinates, refresh / maps / permission actions.
 * Shared by the (legacy) toolbar button and the allocations-map banner.
 */
export function GpsStatusSheet({ visible, onClose, gps }: GpsStatusSheetProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const { status, coordinate, lastUpdatedAt, busy, refresh, askOrOpenSettings } = gps;

  return (
    <BottomSheet
      visible={visible}
      title={t('location.sheetTitle')}
      closeLabel={t('common.cancel')}
      onClose={onClose}
      fitContent
      footer={
        <View style={styles.footer}>
          {status === GPS_STATUS.ask ? (
            <Button
              label={t('location.allowAccess')}
              onPress={() => void askOrOpenSettings()}
              loading={busy}
            />
          ) : null}
          {status === GPS_STATUS.openSettings ? (
            <Button label={t('location.openSettings')} onPress={() => void askOrOpenSettings()} />
          ) : null}
          {status === GPS_STATUS.active || status === GPS_STATUS.noFix ? (
            <Button
              label={t('location.reload')}
              onPress={() => void refresh({ showBusy: true })}
              loading={busy}
              variant="secondary"
            />
          ) : null}
          {coordinate !== null ? (
            <Button
              label={t('location.openMaps')}
              onPress={() => void Linking.openURL(googleMapsSearchUrl(coordinate))}
            />
          ) : null}
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={styles.status}>
          {status === GPS_STATUS.active ? t('location.active') : t('location.inactive')}
        </Text>
        {coordinate !== null ? (
          <View style={styles.coordinateContainer}>
            <Text style={styles.coordinate}>
              {t('location.latitude')}: {coordinate.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordinate}>
              {t('location.longitude')}: {coordinate.longitude.toFixed(6)}
            </Text>
          </View>
        ) : null}
        {lastUpdatedAt !== null ? (
          <Text style={styles.meta}>
            {t('location.lastUpdate', {
              time: formatInstantTime(lastUpdatedAt, locale),
            })}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  status: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  coordinateContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    flexDirection: 'row',
  },
  coordinate: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  meta: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  footer: { gap: spacing.sm },
});
