import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { NumberPlate } from '../components/number-plate';
import { RegisterUnitLayout } from '../components/register-unit-layout';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function ExternalUnitVehicleScreen() {
  const { t } = useTranslation();
  const { external } = useUnitRegistrationFlow();

  return (
    <RegisterUnitLayout
      title={t('unit.vehicleQuestion')}
      message={external.message}
      footer={
        <Button
          label={t('unit.next')}
          onPress={() => router.push('/unit/external/availability')}
          disabled={!external.plate.isValid}
        />
      }
    >
      <NumberPlate
        plateNumber={external.plate.formatted}
        placeholder={t('unit.platePlaceholder')}
        accessibilityLabel={t('unit.plateLabel')}
        editable
        onChangeText={external.changePlate}
      />
    </RegisterUnitLayout>
  );
}
