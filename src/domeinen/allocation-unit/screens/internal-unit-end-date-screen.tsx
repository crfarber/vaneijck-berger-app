import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { EndDateField } from '../components/end-date-field';
import { HomebaseField } from '../components/homebase-field';
import { RegisterUnitLayout } from '../components/register-unit-layout';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function InternalUnitEndDateScreen() {
  const { t } = useTranslation();
  const { internal, options } = useUnitRegistrationFlow();

  useEffect(() => {
    if (internal.done && options !== null) {
      options.onRegistered();
    }
  }, [internal.done, options]);

  return (
    <RegisterUnitLayout
      title={t('unit.endDateQuestion')}
      message={internal.message}
      footer={
        <Button
          label={t('unit.submit')}
          onPress={() => void internal.submit()}
          loading={internal.busy}
        />
      }
    >
      <HomebaseField picker={internal.homebase} />
      <EndDateField endDate={internal.endDate} onChange={internal.changeEndDate} />
    </RegisterUnitLayout>
  );
}
