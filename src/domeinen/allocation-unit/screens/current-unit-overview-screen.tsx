import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { confirm } from '@/shared/ui/confirm';
import { Screen } from '@/shared/ui/screen';
import { colors, spacing, type } from '@/shared/ui/theme';
import { formatActiveUntil, getDeviceTimeZone } from '@/shared/utils/time';
import { CurrentAllocationUnitCard } from '../components/current-allocation-unit-card';
import { useAllocationUnitClock } from '../hooks/allocation-unit-context';
import { useCurrentUnitOverview } from '../hooks/use-current-unit-overview';

export function CurrentUnitOverviewScreen({
  hasActiveWork,
  onChangeUnit,
  onChangeEndDate,
  onMissingUnit,
  onCancel,
  cancelling = false,
}: {
  hasActiveWork: boolean;
  onChangeUnit: () => void;
  onChangeEndDate: () => void;
  onMissingUnit: () => void;
  /** Set when this overview was opened from settings, so the unit can be cancelled here. */
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const clock = useAllocationUnitClock();
  const query = useCurrentUnitOverview();

  const guardActiveWork = (): boolean => {
    if (!hasActiveWork) {
      return true;
    }
    Alert.alert(
      t('unit.changeVehicle.activeWorkTitle'),
      t('unit.changeVehicle.activeWorkMessage'),
      [{ text: t('common.ok') }],
    );
    return false;
  };

  const changeUnit = (): void => {
    if (!guardActiveWork()) {
      return;
    }
    onChangeUnit();
  };

  const changeEndDate = (): void => {
    if (!guardActiveWork()) {
      return;
    }
    onChangeEndDate();
  };

  const confirmCancellation = async (): Promise<void> => {
    if (onCancel === undefined || cancelling) {
      return;
    }
    if (hasActiveWork) {
      Alert.alert(
        t('settings.allocationUnitManagement.activeWorkTitle'),
        t('settings.allocationUnitManagement.activeWorkMessage'),
        [{ text: t('common.ok') }],
      );
      return;
    }
    const accepted = await confirm({
      title: t('settings.allocationUnitManagement.cancelConfirmTitle'),
      message: t('settings.allocationUnitManagement.cancelConfirmMessage'),
      confirmLabel: t('settings.allocationUnitManagement.cancel'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (accepted) {
      onCancel();
    }
  };

  useEffect(() => {
    if (query.data === null && !query.isPending && !query.isError) {
      onMissingUnit();
    }
  }, [onMissingUnit, query.data, query.isError, query.isPending]);

  if (query.isPending || query.data === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (query.isError) {
    return (
      <Screen backgroundColor={colors.background} contentStyle={styles.errorContent}>
        <Text accessibilityRole="alert" style={styles.errorText}>
          {t('unit.overview.loadError')}
        </Text>
        <Button label={t('common.retry')} onPress={() => void query.refetch()} />
      </Screen>
    );
  }

  const overview = query.data;
  const isActive = overview.remainingMinutes !== null && overview.remainingMinutes > 0;
  const activeUntil = formatActiveUntil(
    overview.validUntil,
    i18n.resolvedLanguage ?? i18n.language,
    clock.now(),
    {
      today: t('unit.overview.today'),
      tomorrow: t('unit.overview.tomorrow'),
    },
    getDeviceTimeZone(),
  );

  return (
    <Screen
      contentStyle={styles.content}
      footer={
        <View style={styles.actions}>
          <Button label={t('unit.overview.changeUnit')} onPress={changeUnit} />
          <Button label={t('unit.changeEndDate')} onPress={changeEndDate} variant="secondary" />
          {onCancel !== undefined ? (
            <Button
              label={t('settings.allocationUnitManagement.cancel')}
              variant="danger"
              loading={cancelling}
              onPress={() => void confirmCancellation()}
            />
          ) : null}
        </View>
      }
    >
      <CurrentAllocationUnitCard
        vehicle={{
          vehicleNumber: overview.vehicleNumber,
          vehicleName: overview.vehicleName,
        }}
        trailer={
          overview.trailerName
            ? {
                vehicleNumber: overview.trailerNumber,
                vehicleName: overview.trailerName,
              }
            : undefined
        }
        isActive={isActive}
        activeUntil={activeUntil}
        restrictions={overview.restrictions}
        onUseLastVehicle={changeEndDate}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  errorContent: {
    justifyContent: 'center',
  },
  errorText: {
    ...type.body,
    color: colors.danger,
    textAlign: 'center',
  },
  content: {
    justifyContent: 'center',
  },
});
