import { useLocalSearchParams } from 'expo-router';
import { ServiceFormScreen } from '@/domeinen/service-form/ui';

export default function ServiceFormRoute() {
  const { id, serviceId, mode } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    mode?: string;
  }>();
  return (
    <ServiceFormScreen allocationId={id} serviceId={serviceId} preview={mode === 'readonly'} />
  );
}
