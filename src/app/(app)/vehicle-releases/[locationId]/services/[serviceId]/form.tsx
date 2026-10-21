import { useLocalSearchParams } from 'expo-router';
import { ServiceFormScreen } from '@/domeinen/service-form/ui';

export default function VehicleReleaseFormRoute() {
  const { locationId, serviceId } = useLocalSearchParams<{
    locationId: string;
    serviceId: string;
  }>();
  return (
    <ServiceFormScreen
      allocationId=""
      serviceId={serviceId}
      isReleaseItem
      locationId={locationId}
    />
  );
}
