import { useLocalSearchParams } from 'expo-router';
import { hasActiveAllocations } from '@/domeinen/allocations';
import { AllocationDetailScreen, useAllocations } from '@/domeinen/allocations/ui';
import { useSession } from '@/domeinen/auth/ui';
import { AllocationsToolbar } from '@/domeinen/onboarding/ui';

export default function AllocationDetail() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const userType = useSession((state) => state.userType);
  const { sections } = useAllocations();
  const activeWork = hasActiveAllocations(sections);
  return (
    <AllocationDetailScreen
      allocationId={id}
      preview={mode === 'readonly'}
      toolbar={
        <AllocationsToolbar
          hasActiveAllocations={activeWork}
          canReportIssue={userType === 'internal'}
        />
      }
    />
  );
}
