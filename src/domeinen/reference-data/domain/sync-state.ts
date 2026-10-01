import { z } from 'zod';

/**
 * A sync batch in progress: the entities still to fetch, and the timestamp to commit as the new
 * "since" value once every one of them has succeeded. Kept in storage as one value so an
 * interrupted sync resumes with exactly the entities it had not gotten to yet, instead of asking
 * the server again — the old app asked again with an already-advanced date, silently losing
 * whatever had not synced yet (see docs/functioneel/bekende-fouten-oude-app.md).
 */
export type PendingSync = {
  readonly since: string;
  readonly entities: readonly string[];
};

const pendingSyncSchema = z.object({
  since: z.string().min(1),
  entities: z.array(z.string()),
});

/** Reads the stored batch. Anything that is not a valid batch is treated as none: the next sync
 * starts fresh rather than crashing on damaged data. */
export function parseStoredPending(raw: string | null): PendingSync | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = pendingSyncSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The batch with one entity marked done. */
export function withoutEntity(pending: PendingSync, entity: string): PendingSync {
  return { ...pending, entities: pending.entities.filter((name) => name !== entity) };
}

/** Whether every entity in the batch has synced, and its `since` can be committed. */
export function isSyncComplete(pending: PendingSync): boolean {
  return pending.entities.length === 0;
}
