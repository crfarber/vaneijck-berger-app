import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { EndDateField } from '../components/end-date-field';
import { RegisterUnitLayout } from '../components/register-unit-layout';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function ExternalUnitEndDateScreen() {
  const { t } = useTranslation();
  const { external, options } = useUnitRegistrationFlow();

  useEffect(() => {
    if (external.done && options !== null) {
      options.onRegistered();
    }
  }, [external.done, options]);

  return (
    <RegisterUnitLayout
      title={t('unit.endDateQuestion')}
      message={external.message}
      footer={
        <Button
          label={t('unit.submit')}
          onPress={() => void external.submit()}
          loading={external.busy}
        />
      }
    >
      <EndDateField endDate={external.endDate} onChange={external.changeEndDate} />
    </RegisterUnitLayout>
  );
}
