import { useLocalSearchParams } from 'expo-router';
import { PhotoSentConfirmationScreen } from '@/domeinen/photos/ui';

export default function PhotoSentConfirmationRoute() {
  const { id, serviceId, incidentId, statuscode, photoId } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    incidentId: string;
    statuscode: string;
    photoId: string;
  }>();

  return (
    <PhotoSentConfirmationScreen
      allocationId={id}
      serviceId={serviceId}
      incidentId={incidentId}
      serviceStatuscode={Number(statuscode) || 0}
      photoId={photoId}
    />
  );
}
