import { z } from 'zod';
import type { KeyValueStore } from '@/shared/platform/ports';
import { OUTBOX_KIND, OUTBOX_STATUS, type OutboxItem } from '../domain/delivery';

const STORE_KEY = 'outbox.queue';

const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal(OUTBOX_KIND.finishAllocation), allocationId: z.string() }),
  z.object({
    kind: z.literal(OUTBOX_KIND.declineAllocation),
    allocationId: z.string(),
    statuscode: z.number(),
  }),
  z.object({ kind: z.literal(OUTBOX_KIND.acceptAllocation), allocationId: z.string() }),
  z.object({ kind: z.literal(OUTBOX_KIND.acceptService), serviceId: z.string() }),
  z.object({
    kind: z.literal(OUTBOX_KIND.declineService),
    serviceId: z.string(),
    statuscode: z.number(),
  }),
]);

const itemSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  attempts: z.number(),
  status: z.enum([OUTBOX_STATUS.queued, OUTBOX_STATUS.failed]),
  command: commandSchema,
});

const listSchema = z.array(itemSchema);

export type OutboxRepository = {
  load(): Promise<OutboxItem[]>;
  save(items: readonly OutboxItem[]): Promise<void>;
};

export function createOutboxRepository(store: KeyValueStore): OutboxRepository {
  return {
    async load() {
      const raw = await store.getItem(STORE_KEY);
      if (raw === null || raw === '') {
        return [];
      }
      try {
        return listSchema.parse(JSON.parse(raw));
      } catch {
        return [];
      }
    },

    async save(items) {
      await store.setItem(STORE_KEY, JSON.stringify(items));
    },
  };
}
