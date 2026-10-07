import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { GlassCard } from '@/shared/ui/glass-card';
import { Screen } from '@/shared/ui/screen';
import { colors, radius, spacing, type } from '@/shared/ui/theme';
import { useCurrentUnitOverview } from '../hooks/use-current-unit-overview';
import { formatEndDate, formatRemainingTime } from '@/shared/utils/time';
import { CurrentAllocationUnitCard } from '../components/current-allocation-unit-card';

export function CurrentUnitOverviewScreen({
  onChangeUnit,
  onChangeEndDate,
  onMissingUnit,
}: {
  onChangeUnit: () => void;
  onChangeEndDate: () => void;
  onMissingUnit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const query = useCurrentUnitOverview();

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
  const endTime = formatEndDate(overview.validUntil, i18n.resolvedLanguage ?? i18n.language, {
    timeStyle: 'short',
  });
  const endDateAndTime = formatEndDate(
    overview.validUntil,
    i18n.resolvedLanguage ?? i18n.language,
    { timeStyle: 'short', dateStyle: 'medium' },
  );
  const remainingTime = formatRemainingTime(overview.remainingMinutes, t);
  const isActive = overview.remainingMinutes !== null && overview.remainingMinutes > 0;
  const elapsedProgress =
    overview.remainingMinutes === null
      ? 0
      : Math.min(1, Math.max(0, 1 - overview.remainingMinutes / (24 * 60)));
  const availability =
    overview.restrictions.length === 0
      ? t('unit.fullyAvailable')
      : overview.restrictions.map((key) => t(`unit.${key}`)).join('\n');

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label={t('unit.overview.changeUnit')} onPress={onChangeUnit} />
          <Button label={t('unit.changeEndDate')} onPress={onChangeEndDate} variant="secondary" />
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
        endTime={endTime}
        remainingTime={remainingTime}
        elapsedProgress={elapsedProgress}
        onUseLastVehicle={onChangeEndDate}
      />
      <GlassCard>
        <DetailRow
          label={t('unit.endDateLabel')}
          value={endDateAndTime ?? t('unit.overview.notSet')}
        />
        <DetailRow label={t('unit.availabilityTitle')} value={availability} last />
      </GlassCard>
    </Screen>
  );
}

function DetailRow({
  label,
  value,
  secondaryValue,
  last = false,
}: {
  label: string;
  value: string;
  secondaryValue?: string | null;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailDivider]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueGroup}>
        <Text style={styles.detailValue}>{value}</Text>
        {secondaryValue ? <Text style={styles.detailSecondary}>{secondaryValue}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  title: {
    ...type.large,
    color: colors.text,
    textAlign: 'left',
  },
  statusCard: {
    backgroundColor: colors.brandDarker,
    borderRadius: radius.xl,
    gap: spacing.md,
    padding: spacing.md,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    ...type.body,
    color: colors.brandLight,
    fontWeight: '600',
  },
  vehicleNumber: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  remainingText: {
    ...type.body,
    color: colors.brandLight,
    flexShrink: 1,
    fontWeight: '700',
    textAlign: 'right',
  },
  progressTrack: {
    backgroundColor: '#4A4D54',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.brand,
    height: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    minHeight: 68,
  },
  detailDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...type.body,
    color: colors.textMuted,
    flex: 1,
  },
  detailValueGroup: {
    flex: 2,
    alignItems: 'flex-start',
    gap: spacing.xs,
    flexDirection: 'column',
  },
  detailValue: {
    ...type.header,
    color: colors.text,
    textAlign: 'left',
  },
  detailSecondary: {
    ...type.label,
    color: colors.textMuted,
    textAlign: 'left',
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
});
