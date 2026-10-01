import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { FleetPickerList } from '../components/fleet-picker-list';
import { RegisterUnitLayout } from '../components/register-unit-layout';
import { useUnitRegistrationFlow } from '../hooks/unit-registration-flow-context';

export function InternalUnitTrailerScreen() {
  const { t } = useTranslation();
  const { internal } = useUnitRegistrationFlow();

  return (
    <RegisterUnitLayout
      title={t('unit.trailerQuestion')}
      message={internal.message}
      footer={
        <Button
          label={t('unit.noTrailerChoice')}
          variant={internal.trailer === null ? 'primary' : 'secondary'}
          onPress={() => {
            internal.selectTrailer(null);
            router.push('/unit/internal/availability');
          }}
        />
      }
    >
      <FleetPickerList
        vehicles={internal.trailers}
        recentVehicles={internal.trailer ? [internal.trailer] : []}
        selectedId={internal.trailer?.id}
        onSelect={(vehicle) => {
          internal.selectTrailer(vehicle);
          router.push('/unit/internal/availability');
        }}
        searchPlaceholder={t('unit.searchVehiclePlaceholder')}
        recentTitle={t('unit.recentVehicles')}
        allTitle={t('unit.trailers')}
        emptyLabel={t('unit.noVehiclesFound')}
      />
    </RegisterUnitLayout>
  );
}
