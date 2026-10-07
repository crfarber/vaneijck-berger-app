import { useLocalSearchParams } from 'expo-router';
import { parsePhaseNumbersParam } from '@/domeinen/photos';
import { PhotoSentConfirmationScreen } from '@/domeinen/photos/ui';

export default function PhotoSentConfirmationRoute() {
  const { id, serviceId, incidentId, statuscode, photoId, phaseNumbers } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    incidentId: string;
    statuscode: string;
    photoId: string;
    phaseNumbers?: string;
  }>();

  return (
    <PhotoSentConfirmationScreen
      allocationId={id}
      serviceId={serviceId}
      incidentId={incidentId}
      serviceStatuscode={Number(statuscode) || 0}
      phaseNumbers={parsePhaseNumbersParam(phaseNumbers)}
      photoId={photoId}
    />
  );
}
