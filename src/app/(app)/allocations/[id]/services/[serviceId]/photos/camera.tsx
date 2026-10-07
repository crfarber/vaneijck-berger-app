import { useLocalSearchParams } from 'expo-router';
import { parsePhaseNumbersParam } from '@/domeinen/photos';
import { PhotoCaptureScreen } from '@/domeinen/photos/ui';

export default function PhotoCameraRoute() {
  const {
    id,
    serviceId,
    incidentId,
    statuscode,
    category,
    mode,
    position,
    help,
    phaseNumbers,
    overrideExisting,
    isExtraOverride,
    replacePhotoId,
  } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    incidentId: string;
    statuscode: string;
    category?: string;
    mode: string;
    position?: string;
    help?: string;
    phaseNumbers?: string;
    overrideExisting?: string;
    isExtraOverride?: string;
    replacePhotoId?: string;
  }>();

  return (
    <PhotoCaptureScreen
      allocationId={id}
      serviceId={serviceId}
      incidentId={incidentId}
      serviceStatuscode={Number(statuscode) || 0}
      phaseNumbers={parsePhaseNumbersParam(phaseNumbers)}
      category={category}
      mode={mode}
      position={typeof position === 'string' ? position : undefined}
      help={typeof help === 'string' ? help : undefined}
      overrideExisting={overrideExisting === '1'}
      isExtraOverride={typeof isExtraOverride === 'string' ? isExtraOverride === '1' : undefined}
      replacePhotoId={typeof replacePhotoId === 'string' ? replacePhotoId : undefined}
    />
  );
}
