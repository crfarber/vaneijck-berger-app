import { describe, expect, it, vi } from 'vitest';
import { HttpError, NetworkError } from '@/shared/api/errors';
import { createFakeClock, createFakeScheduler, createInMemoryStore } from '@/test/fakes';
import { OUTBOX_KIND, OUTBOX_STATUS } from '../domain/delivery';
import { createOutboxRepository } from './outbox-repository';
import { createOutboxService } from './outbox-service';

function setup(send: (command: { kind: string }) => Promise<void> = async () => undefined) {
  const clock = createFakeClock();
  const scheduler = createFakeScheduler();
  const sender = vi.fn(send);
  const service = createOutboxService({
    repository: createOutboxRepository(createInMemoryStore()),
    send: sender,
    clock,
    scheduler,
  });
  service.start();
  return { service, sender, scheduler };
}

describe('outbox', () => {
  it('sends a queued finish and then drops it', async () => {
    const { service, sender } = setup();

    await service.enqueue({ kind: OUTBOX_KIND.finishAllocation, allocationId: 'alloc-1' });
    await service.processNow();

    expect(sender).toHaveBeenCalledWith({
      kind: OUTBOX_KIND.finishAllocation,
      allocationId: 'alloc-1',
    });
    expect(await service.list()).toEqual([]);
  });

  it('keeps a temporary failure at the head and sends it on the next drain', async () => {
    const sender = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce(undefined);
    const { service, scheduler } = setup(sender);

    await service.enqueue({ kind: OUTBOX_KIND.acceptService, serviceId: 'svc-1' });
    await service.enqueue({ kind: OUTBOX_KIND.finishAllocation, allocationId: 'alloc-2' });
    await service.processNow();

    expect(
      (await service.list()).filter((item) => item.status === OUTBOX_STATUS.queued),
    ).toHaveLength(2);
    expect(sender).toHaveBeenCalledTimes(1);

    await scheduler.fireNext();
    await service.processNow();

    expect(sender).toHaveBeenCalledTimes(3);
    expect(await service.list()).toEqual([]);
  });

  it('marks a conflict as failed and still sends the next item', async () => {
    const sender = vi
      .fn()
      .mockRejectedValueOnce(new HttpError(409, null, 'conflict'))
      .mockResolvedValueOnce(undefined);
    const { service } = setup(sender);

    await service.enqueue({ kind: OUTBOX_KIND.finishAllocation, allocationId: 'alloc-1' });
    await service.enqueue({ kind: OUTBOX_KIND.acceptService, serviceId: 'svc-1' });
    await service.processNow();

    const items = await service.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.status).toBe(OUTBOX_STATUS.failed);
    expect(sender).toHaveBeenCalledTimes(2);
  });
});
