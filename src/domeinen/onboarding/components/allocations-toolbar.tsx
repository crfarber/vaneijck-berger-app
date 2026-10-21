import { ChangeVehicleButton, DispatchButton } from '@/domeinen/allocation-unit/ui';
import { AllocationsMapButton } from '@/domeinen/allocations/ui';
import { NotificationBellButton } from '@/domeinen/notifications/ui';
import { Toolbar, ToolbarSlot } from '@/shared/ui/toolbar';

/**
 * Full-width row of toolbar icons — composed here so domains stay independent.
 * GPS status lives on the allocations map banner (not a toolbar tile).
 */
export function AllocationsToolbar({ hasActiveAllocations }: { hasActiveAllocations: boolean }) {
  return (
    <Toolbar>
      <ToolbarSlot>
        <AllocationsMapButton />
      </ToolbarSlot>
      <ToolbarSlot>
        <DispatchButton />
      </ToolbarSlot>
      <ToolbarSlot>
        <ChangeVehicleButton hasActiveAllocations={hasActiveAllocations} />
      </ToolbarSlot>
      <ToolbarSlot>
        <NotificationBellButton />
      </ToolbarSlot>
    </Toolbar>
  );
}
