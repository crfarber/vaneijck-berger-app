import { useLocalSearchParams } from 'expo-router';
import { PhotoCaptureScreen } from '@/domeinen/photos/ui';

export default function PhotoCameraRoute() {
  const { id, serviceId, incidentId, statuscode, category, mode, position, help } =
    useLocalSearchParams<{
      id: string;
      serviceId: string;
      incidentId: string;
      statuscode: string;
      category?: string;
      mode: string;
      position?: string;
      help?: string;
    }>();

  return (
    <PhotoCaptureScreen
      allocationId={id}
      serviceId={serviceId}
      incidentId={incidentId}
      serviceStatuscode={Number(statuscode) || 0}
      category={category}
      mode={mode}
      position={typeof position === 'string' ? position : undefined}
      help={typeof help === 'string' ? help : undefined}
    />
  );
}
