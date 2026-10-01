import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { AvailabilityFields } from '../components/availability-fields';
import { RegisterUnitLayout } from '../components/register-unit-layout';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function InternalUnitAvailabilityScreen() {
  const { t } = useTranslation();
  const { internal } = useUnitRegistrationFlow();

  return (
    <RegisterUnitLayout
      title={t('unit.availabilityQuestion')}
      message={internal.message}
      footer={
        <Button label={t('unit.next')} onPress={() => router.push('/unit/internal/end-date')} />
      }
    >
      <AvailabilityFields
        availability={internal.availability}
        onToggle={internal.toggleAvailability}
        onFullyAvailable={internal.setFullyAvailable}
      />
    </RegisterUnitLayout>
  );
}
