import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/shared/ui/glass-card';
import { Button } from '@/shared/ui/button';
import { colors, radius, spacing, type } from '@/shared/ui/theme';
import type { UnitAvailability } from '../domain/availability';
import { displayVehicleRegistration } from '../domain/license-plate';
import { NumberPlate } from './number-plate';

export type CurrentAllocationUnitOverview = {
  vehicleNumber?: string | null;
  vehicleName?: string | null;
};

export type CurrentAllocationUnitCardProps = {
  vehicle: CurrentAllocationUnitOverview;
  trailer?: CurrentAllocationUnitOverview;
  /** Full overview (end date + availability) or reuse prompt (vehicle only). */
  mode?: 'full' | 'reuse';
  isActive: boolean;
  activeUntil: string | null;
  restrictions: readonly (keyof UnitAvailability)[];
  onUseLastVehicle: () => void;
  /** Overrides status / action copy (defaults depend on mode). */
  statusLabel?: string;
  actionLabel?: string;
};

const RESTRICTION_CHIP_KEY = {
  notAvailableForIM: 'unit.restrictionChip.notAvailableForIM',
  onlyAvailableForTransport: 'unit.restrictionChip.onlyAvailableForTransport',
  onlyAvailableForBreakdown: 'unit.restrictionChip.onlyAvailableForBreakdown',
  notAvailableForAllocation: 'unit.restrictionChip.notAvailableForAllocation',
} as const satisfies Record<keyof UnitAvailability, string>;

export function CurrentAllocationUnitCard({
  vehicle,
  trailer,
  mode = 'full',
  isActive,
  activeUntil,
  restrictions,
  onUseLastVehicle,
  statusLabel: statusLabelProp,
  actionLabel,
}: CurrentAllocationUnitCardProps) {
  const { t } = useTranslation();
  const reuseMode = mode === 'reuse';
  const statusLabel =
    statusLabelProp ??
    (reuseMode
      ? t('unit.overview.lastUsed')
      : isActive
        ? t('unit.overview.active')
        : t('unit.recentVehicles'));
  const availabilitySummary =
    restrictions.length === 0
      ? t('unit.overview.noRestrictions')
      : t('unit.overview.restrictionCount', { count: restrictions.length });
  const buttonLabel =
    actionLabel ?? (reuseMode ? t('unit.overview.useThisUnit') : t('unit.overview.useLastVehicle'));

  return (
    <GlassCard style={styles.card}>
      <View style={styles.content}>
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusDot,
              reuseMode || !isActive ? styles.statusDotLast : styles.statusDotActive,
            ]}
          />
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </View>

        <NumberPlate
          plateNumber={vehicle.vehicleName ?? ''}
          vehicleNumber={vehicle.vehicleNumber ?? undefined}
        />

        {trailer?.vehicleName ? (
          <View style={styles.trailerRow}>
            <Text style={styles.metaLabel}>{t('unit.overview.trailer')}</Text>
            <View style={styles.trailerValue}>
              <PlateChip plateNumber={trailer.vehicleName} />
              {trailer.vehicleNumber ? (
                <Text style={styles.trailerNumber}>{trailer.vehicleNumber}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {!reuseMode ? (
          <>
            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('unit.endDateLabel')}</Text>
              <Text style={styles.metaValue}>{activeUntil ?? t('unit.overview.notSet')}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.availabilityBlock}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('unit.availabilityTitle')}</Text>
                <Text style={styles.metaMuted}>{availabilitySummary}</Text>
              </View>
              {restrictions.length > 0 ? (
                <View style={styles.chips}>
                  {restrictions.map((key) => (
                    <View key={key} style={styles.chip}>
                      <Text style={styles.chipText}>{t(RESTRICTION_CHIP_KEY[key])}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {reuseMode || !isActive ? (
          <Button onPress={onUseLastVehicle} label={buttonLabel} variant="action" />
        ) : null}
      </View>
    </GlassCard>
  );
}

function PlateChip({ plateNumber }: { plateNumber: string }) {
  const { text } = displayVehicleRegistration(plateNumber);
  return (
    <View style={styles.plateChip}>
      <Text style={styles.plateChipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotLast: {
    backgroundColor: colors.brand,
  },
  statusLabel: {
    ...type.small,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trailerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  trailerLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  trailerValue: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  trailerNumber: {
    ...type.label,
    color: colors.textMuted,
  },
  plateChip: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  plateChipText: {
    color: colors.brandText,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaLabel: {
    ...type.label,
    color: colors.textMuted,
  },
  metaValue: {
    ...type.body,
    color: colors.text,
    fontWeight: '700',
  },
  metaMuted: {
    ...type.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  availabilityBlock: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    ...type.small,
    color: colors.text,
    fontWeight: '600',
  },
  useButton: {
    alignItems: 'center',
    backgroundColor: colors.brandDark,
    borderRadius: radius.xxl,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  useButtonPressed: {
    opacity: 0.85,
  },
  useButtonLabel: {
    ...type.body,
    color: colors.brand,
    fontWeight: '700',
  },
});
