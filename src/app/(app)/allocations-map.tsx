import { useLocalSearchParams } from 'expo-router';
import { AllocationsMapScreen } from '@/domeinen/allocations/ui';

export default function AllocationsMapRoute() {
  const { allocationId } = useLocalSearchParams<{ allocationId?: string }>();
  return <AllocationsMapScreen focusAllocationId={allocationId} />;
}
