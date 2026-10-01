import { describe, expect, it } from 'vitest';
import { OUTBOX_KIND, OUTBOX_STATUS } from './delivery';
import { pendingIdsFromOutbox } from './pending';

describe('pendingIdsFromOutbox', () => {
  it('collects allocation and service ids from queued items only', () => {
    const pending = pendingIdsFromOutbox([
      {
        id: '1',
        createdAt: 1,
        attempts: 0,
        status: OUTBOX_STATUS.queued,
        command: { kind: OUTBOX_KIND.acceptAllocation, allocationId: 'a-1' },
      },
      {
        id: '2',
        createdAt: 2,
        attempts: 0,
        status: OUTBOX_STATUS.failed,
        command: { kind: OUTBOX_KIND.acceptAllocation, allocationId: 'a-2' },
      },
      {
        id: '3',
        createdAt: 3,
        attempts: 0,
        status: OUTBOX_STATUS.queued,
        command: { kind: OUTBOX_KIND.declineService, serviceId: 's-1', statuscode: 1 },
      },
    ]);

    expect([...pending.allocationIds]).toEqual(['a-1']);
    expect([...pending.serviceIds]).toEqual(['s-1']);
  });
});
