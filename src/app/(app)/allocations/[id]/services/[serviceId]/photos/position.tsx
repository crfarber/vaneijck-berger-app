import { useLocalSearchParams } from 'expo-router';
import { ExtraPhotoPositionScreen } from '@/domeinen/photos/ui';

export default function ExtraPhotoPositionRoute() {
  const { id, serviceId, incidentId, statuscode } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    incidentId: string;
    statuscode: string;
  }>();

  return (
    <ExtraPhotoPositionScreen
      allocationId={id}
      serviceId={serviceId}
      incidentId={incidentId}
      serviceStatuscode={Number(statuscode) || 0}
    />
  );
}
