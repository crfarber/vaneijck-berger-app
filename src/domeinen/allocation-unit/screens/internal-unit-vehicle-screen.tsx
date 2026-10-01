import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { QRSVG } from '@/shared/ui/icons/qrcode';
import { colors } from '@/shared/ui/theme';
import { FleetPickerList } from '../components/fleet-picker-list';
import { RegisterUnitLayout } from '../components/register-unit-layout';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function InternalUnitVehicleScreen() {
  const { t } = useTranslation();
  const { internal } = useUnitRegistrationFlow();

  if (internal.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <RegisterUnitLayout title={t('unit.vehicleQuestion')} message={internal.message} footer={null}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('unit.scanTruckTitle')}
        onPress={() => router.push('/unit/internal/scan')}
        style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}
      >
        <QRSVG color={colors.text} />
        <View style={styles.scanText}>
          <Text style={styles.scanTitle}>{t('unit.scanTruckTitle')}</Text>
          <Text style={styles.scanHint}>{t('unit.scanTruckHint')}</Text>
        </View>
      </Pressable>
      <FleetPickerList
        vehicles={internal.trucks}
        recentVehicles={internal.recentTrucks}
        selectedId={internal.truck?.id}
        onSelect={(vehicle) => {
          internal.selectTruck(vehicle);
          router.push('/unit/internal/trailer');
        }}
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.buttonLight,
  },
  scanText: { flex: 1, gap: 2 },
  scanTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  scanHint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.75 },
});
