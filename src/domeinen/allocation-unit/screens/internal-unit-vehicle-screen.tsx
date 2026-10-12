import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/shared/ui/theme';
import { FleetPickerList } from '../components/fleet-picker-list';
import { RegisterUnitLayout } from '../components/register-unit-layout';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function InternalUnitVehicleScreen() {
  const { t } = useTranslation();
  const { internal } = useUnitRegistrationFlow();

  if (internal.loading) {
    return (
      <View style={[styles.center, styles.opaque]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <RegisterUnitLayout
      title={t('unit.vehicleQuestion')}
      message={internal.message}
      scroll={false}
      backgroundColor={colors.background}
      footer={null}
    >
      <FleetPickerList
        vehicles={internal.trucks}
        recentVehicles={internal.recentTrucks}
        selectedId={internal.truck?.id}
        onSelect={(vehicle) => {
          internal.selectTruck(vehicle);
          router.push('/unit/internal/trailer');
        }}
        onScan={() => router.push('/unit/internal/scan')}
        searchPlaceholder={t('unit.searchVehiclePlaceholder')}
        recentTitle={t('unit.recentVehicles')}
        allTitle={t('unit.allVehicles')}
        emptyLabel={t('unit.noVehiclesFound')}
      />
    </RegisterUnitLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  opaque: { backgroundColor: colors.background },
});
