import { useLocalSearchParams } from 'expo-router';
import { ServiceFinishScreen } from '@/domeinen/allocations/ui';

export default function ServiceFinish() {
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId: string }>();
  return <ServiceFinishScreen allocationId={id} serviceId={serviceId} />;
}
