import { useLocalSearchParams } from 'expo-router';
import { hasActiveAllocations } from '@/domeinen/allocations';
import { AllocationDetailScreen, useAllocations } from '@/domeinen/allocations/ui';
import { AllocationsToolbar } from '@/domeinen/onboarding/ui';

export default function AllocationDetail() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { sections } = useAllocations();
  const activeWork = hasActiveAllocations(sections);
  return (
    <AllocationDetailScreen
      allocationId={id}
      preview={mode === 'readonly'}
      toolbar={<AllocationsToolbar hasActiveAllocations={activeWork} />}
    />
  );
}
