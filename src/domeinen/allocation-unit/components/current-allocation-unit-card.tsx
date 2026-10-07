import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '@/shared/ui/theme';
import { useTranslation } from 'react-i18next';
import { Pill } from '@/shared/ui/pill';
import { NumberPlate } from './number-plate';
import { GlassCard } from '@/shared/ui/glass-card';
import { Button } from '@/shared/ui/button';

export type CurrentAllocationUnitOverview = {
  vehicleNumber?: string | null;
  vehicleName?: string | null;
};

export type CurrentAllocationUnitCardProps = {
  vehicle: CurrentAllocationUnitOverview;
  trailer?: CurrentAllocationUnitOverview;
  isActive: boolean;
  endTime: string | null;
  remainingTime: string;
  elapsedProgress: number;
  onUseLastVehicle: () => void;
};

export function CurrentAllocationUnitCard({
  vehicle,
  trailer,
  isActive,
  endTime,
  remainingTime,
  elapsedProgress,
  onUseLastVehicle,
}: CurrentAllocationUnitCardProps) {
  const { t } = useTranslation();
  const progress = Math.min(1, Math.max(0, elapsedProgress));

  return (
    <GlassCard>
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text accessibilityRole="header" style={styles.title}>
            {t(isActive ? 'unit.overview.vehicleCardTitle' : 'unit.overview.lastVehicleTitle')}
          </Text>
          {isActive ? <Pill label={t('unit.overview.active')} tone="success" /> : null}
        </View>
        <NumberPlate
          plateNumber={vehicle.vehicleName ?? ''}
          vehicleNumber={vehicle.vehicleNumber ?? ''}
        />
        {trailer ? (
          <NumberPlate
            plateNumber={trailer?.vehicleName ?? ''}
            vehicleNumber={trailer?.vehicleNumber ?? ''}
          />
        ) : null}
        {!isActive ? (
          <Button label={t('unit.overview.useLastVehicle')} onPress={onUseLastVehicle} />
        ) : endTime ? (
          <>
            <View style={styles.remainingRow}>
              <Text style={styles.statusLabel}>
                {t('unit.endDateLabel')} {endTime}
              </Text>
              <Text style={styles.remainingText}>{remainingTime}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.large,
    color: colors.text,
    textAlign: 'left',
    flex: 1,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#333',
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
  },
});
