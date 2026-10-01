import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PERMISSION_KIND, type PermissionSnapshot } from '@/domeinen/settings';
import { useDevicePermissions } from '@/domeinen/settings/ui';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { colors, spacing } from '@/shared/ui/theme';
import {
  GPS_STATUS,
  gpsButtonVariant,
  resolveGpsStatus,
  type GpsStatus,
} from '../domain/gps-status';
import { googleMapsSearchUrl } from '../domain/maps-url';
import { resolveCurrentPosition, type CurrentLocation } from '../domain/proximity';
import { useLocationClock, useLocationReader } from '../hooks/location-context';
import LocationIcon from '@/shared/ui/icons/location';

const EMPTY_PERMISSION: PermissionSnapshot = {
  status: 'undetermined',
  canAskAgain: true,
};

/**
 * GPS status tile for the allocations toolbar. Green when location permission is granted (even
 * without a fix yet); red otherwise. Opens a sheet with coordinates and refresh / maps / settings.
 */
export function LocationStatusButton() {
  const { t } = useTranslation();
  const reader = useLocationReader();
  const clock = useLocationClock();
  const permissions = useDevicePermissions();
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState<PermissionSnapshot>(EMPTY_PERMISSION);
  const [position, setPosition] = useState<CurrentLocation>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (options?: { showBusy?: boolean }): Promise<void> => {
      const showBusy = options?.showBusy === true;
      if (showBusy) {
        setBusy(true);
      }
      try {
        const nextPermission = await permissions.read(PERMISSION_KIND.location);
        setPermission(nextPermission);
        const nextPosition = await reader.getCurrent();
        setPosition(nextPosition);
        if (resolveCurrentPosition(nextPosition) !== null) {
          setLastUpdatedAt(clock.now());
        }
      } finally {
        if (showBusy) {
          setBusy(false);
        }
      }
    },
    [permissions, reader, clock],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void permissions.read(PERMISSION_KIND.location).then(async (nextPermission) => {
        if (cancelled) {
          return;
        }
        setPermission(nextPermission);
        const nextPosition = await reader.getCurrent();
        if (cancelled) {
          return;
        }
        setPosition(nextPosition);
        if (resolveCurrentPosition(nextPosition) !== null) {
          setLastUpdatedAt(clock.now());
        }
      });
      return () => {
        cancelled = true;
      };
    }, [permissions, reader, clock]),
  );

  const status: GpsStatus = resolveGpsStatus(permission, position);
  const coordinate = resolveCurrentPosition(position);

  const askOrOpenSettings = async (): Promise<void> => {
    if (status === GPS_STATUS.ask) {
      const next = await permissions.request(PERMISSION_KIND.location);
      setPermission(next);
      await refresh();
      return;
    }
    if (status === GPS_STATUS.openSettings) {
      await permissions.openSystemSettings();
    }
  };

  return (
    <>
      <ToolbarButton
        accessibilityLabel={t('toolbar.gps')}
        variant={gpsButtonVariant(status)}
        onPress={() => {
          setVisible(true);
          void refresh({ showBusy: true });
        }}
      >
        <LocationIcon size={24} color={colors.background} />
      </ToolbarButton>
      <BottomSheet
        visible={visible}
        title={t('location.sheetTitle')}
        closeLabel={t('common.cancel')}
        onClose={() => setVisible(false)}
        height="50%"
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
            <Text style={styles.coordinates}>
              {t('location.coordinates', {
                lat: coordinate.latitude.toFixed(6),
                lng: coordinate.longitude.toFixed(6),
              })}
            </Text>
          ) : null}
          {lastUpdatedAt !== null ? (
            <Text style={styles.meta}>
              {t('location.lastUpdate', {
                time: new Date(lastUpdatedAt).toLocaleTimeString(),
              })}
            </Text>
          ) : null}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingVertical: spacing.sm },
  status: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  coordinates: { fontSize: 15, color: colors.text, textAlign: 'center' },
  meta: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  footer: { gap: spacing.sm },
});
