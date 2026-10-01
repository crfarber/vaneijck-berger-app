import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { AvailabilityFields } from '../components/availability-fields';
import { RegisterUnitLayout } from '../components/register-unit-layout';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function ExternalUnitAvailabilityScreen() {
  const { t } = useTranslation();
  const { external } = useUnitRegistrationFlow();

  return (
    <RegisterUnitLayout
      title={t('unit.availabilityQuestion')}
      message={external.message}
      footer={
        <Button label={t('unit.next')} onPress={() => router.push('/unit/external/end-date')} />
      }
    >
      <AvailabilityFields
        availability={external.availability}
        onToggle={external.toggleAvailability}
        onFullyAvailable={external.setFullyAvailable}
      />
    </RegisterUnitLayout>
  );
}
