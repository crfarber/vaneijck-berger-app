import { useLocalSearchParams } from 'expo-router';
import { ServiceFormScreen } from '@/domeinen/service-form/ui';

export default function ServiceFinish() {
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId: string }>();
  return <ServiceFormScreen allocationId={id} serviceId={serviceId} finishMode />;
}
