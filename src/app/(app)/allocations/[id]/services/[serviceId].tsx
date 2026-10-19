import { useLocalSearchParams } from 'expo-router';
import { ServiceFinishScreen } from '@/domeinen/service-form/ui';

export default function ServiceFinish() {
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId: string }>();
  return <ServiceFinishScreen allocationId={id} serviceId={serviceId} />;
}
