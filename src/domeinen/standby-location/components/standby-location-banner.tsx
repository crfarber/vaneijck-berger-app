import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAllocationUnitService, useEndDatePreference } from '@/domeinen/allocation-unit/ui';
import {
  ACCEPT_LOCATION_MAX_AGE_MS,
  ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
  resolveCurrentPosition,
} from '@/domeinen/location';
import { useLocationClock, useLocationReader } from '@/domeinen/location/ui';
import { CardActionButton } from '@/shared/ui/card-action-button';
import { colors, radius, spacing, type } from '@/shared/ui/theme';
import { formatStandbyAddressShort } from '../domain/address';
import { isWithinStandbyDistance } from '../domain/arrival';
import { hasShiftEnded } from '../domain/shift';
import { isStandbyBannerVisible } from '../domain/visibility';
import type { StandbyLocationAdvice } from '../domain/types';
import { useStandbyLocation, useStandbyLocationApi } from '../hooks/standby-location-context';
import { StandbyLocationMapSheet } from './standby-location-map-sheet';

type StandbyLocationBannerProps = {
  hasBlockingItems: boolean;
};

export function StandbyLocationBanner({ hasBlockingItems }: StandbyLocationBannerProps) {
  const { t } = useTranslation();
  const service = useStandbyLocationApi();
  const status = useStandbyLocation((state) => state.status);
  const pendingAdvice = useStandbyLocation((state) => state.pendingAdvice);
  const locationReader = useLocationReader();
  const unitService = useAllocationUnitService();
  const endDatePreference = useEndDatePreference();
  const clock = useLocationClock();
  const [mapAdvice, setMapAdvice] = useState<StandbyLocationAdvice | null>(null);

  const visible = isStandbyBannerVisible({
    status,
    pendingAdvice,
    hasBlockingItems,
  });
  const advice = visible ? pendingAdvice : null;

  useEffect(() => {
    if (status === 'active' && hasBlockingItems) {
      service.expire();
    }
  }, [status, hasBlockingItems, service]);

  const markArrived = useCallback((): void => {
    void service.clear();
  }, [service]);

  const runLifecycleChecks = useCallback(async () => {
    if (status !== 'active' || pendingAdvice === null || !visible) {
      return;
    }

    if (hasBlockingItems) {
      service.expire();
      return;
    }

    const unit = await unitService.getCurrent();
    const rememberedEndDateIso = await endDatePreference.getRememberedEndDateIso();
    if (
      hasShiftEnded({
        validUntilIso: unit?.validUntil,
        rememberedEndDateIso,
        nowMs: clock.now(),
      })
    ) {
      service.expire();
      return;
    }

    // Precise fix on focus / return from background — coarse is not enough for the 500 m boundary.
    const current = resolveCurrentPosition(
      await locationReader.getCurrent({
        accuracy: 'fine',
        maxAgeMs: ACCEPT_LOCATION_MAX_AGE_MS,
        requiredAccuracyMeters: ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
      }),
    );
    if (
      isWithinStandbyDistance(current, {
        latitude: pendingAdvice.latitude,
        longitude: pendingAdvice.longitude,
      })
    ) {
      await service.clear();
    }
  }, [
    status,
    pendingAdvice,
    visible,
    hasBlockingItems,
    service,
    unitService,
    endDatePreference,
    clock,
    locationReader,
  ]);

  useFocusEffect(
    useCallback(() => {
      void runLifecycleChecks();
    }, [runLifecycleChecks]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void runLifecycleChecks();
      }
    });
    return () => subscription.remove();
  }, [runLifecycleChecks]);

  useEffect(() => {
    void runLifecycleChecks();
  }, [runLifecycleChecks]);

  if (advice === null) {
    return null;
  }

  const address = formatStandbyAddressShort(advice);
  const receivedTime = new Date(advice.receivedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <View style={styles.banner}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>{t('standbyLocation.bannerLabel')}</Text>
          <Text style={styles.time}>{receivedTime}</Text>
        </View>
        {address !== '' ? <Text style={styles.address}>{address}</Text> : null}
        <Text style={styles.subtitle}>{t('standbyLocation.bannerSubtitle')}</Text>
        <View style={styles.actions}>
          <CardActionButton
            label={t('standbyLocation.navigate')}
            icon="navigate"
            onPress={() => setMapAdvice(advice)}
          />
          <CardActionButton
            label={t('standbyLocation.arrived')}
            icon="checkmark-circle"
            onPress={markArrived}
            variant="success"
          />
        </View>
      </View>
      <StandbyLocationMapSheet advice={mapAdvice} onClose={() => setMapAdvice(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.brandAction,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  time: { ...type.small, color: colors.background, opacity: 0.9 },
  address: { ...type.header, color: colors.background, fontWeight: '700' },
  subtitle: { ...type.small, color: colors.background, opacity: 0.9 },
  actions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
