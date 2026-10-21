import { useLocalSearchParams } from 'expo-router';
import { parsePhaseNumbersParam } from '@/domeinen/photos';
import { ExtraPhotoPositionScreen } from '@/domeinen/photos/ui';

export default function ExtraPhotoPositionRoute() {
  const { id, serviceId, incidentId, statuscode, phaseNumbers, locationId } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    incidentId: string;
    statuscode: string;
    phaseNumbers?: string;
    locationId?: string;
  }>();

  return (
    <ExtraPhotoPositionScreen
      allocationId={id}
      serviceId={serviceId}
      incidentId={incidentId}
      serviceStatuscode={Number(statuscode) || 0}
      phaseNumbers={parsePhaseNumbersParam(phaseNumbers)}
      locationId={locationId}
    />
  );
}
