import { OUTBOX_KIND, OUTBOX_STATUS, type OutboxItem } from './delivery';

export type PendingMutationIds = {
  allocationIds: ReadonlySet<string>;
  serviceIds: ReadonlySet<string>;
};

/** Which cards should show "waiting for connection" for the currently queued outbox items. */
export function pendingIdsFromOutbox(items: readonly OutboxItem[]): PendingMutationIds {
  const allocationIds = new Set<string>();
  const serviceIds = new Set<string>();
  for (const item of items) {
    if (item.status !== OUTBOX_STATUS.queued) {
      continue;
    }
    switch (item.command.kind) {
      case OUTBOX_KIND.finishAllocation:
      case OUTBOX_KIND.declineAllocation:
      case OUTBOX_KIND.acceptAllocation:
        allocationIds.add(item.command.allocationId);
        break;
      case OUTBOX_KIND.acceptService:
      case OUTBOX_KIND.declineService:
        serviceIds.add(item.command.serviceId);
        break;
    }
  }
  return { allocationIds, serviceIds };
}
