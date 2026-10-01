import { ChangeVehicleButton, DispatchButton } from '@/domeinen/allocation-unit/ui';
import { LocationStatusButton } from '@/domeinen/location/ui';
import { NotificationBellButton } from '@/domeinen/notifications/ui';
import { Toolbar, ToolbarSlot } from '@/shared/ui/toolbar';

/** Full-width row of toolbar icons — composed here so domains stay independent. */
export function AllocationsToolbar({
  hasActiveAllocations,
  canReportIssue,
}: {
  hasActiveAllocations: boolean;
  canReportIssue: boolean;
}) {
  return (
    <Toolbar>
      <ToolbarSlot>
        <LocationStatusButton />
      </ToolbarSlot>
      <ToolbarSlot>
        <DispatchButton canReportIssue={canReportIssue} />
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
