import { z } from 'zod';
import type { UserType } from '@/domeinen/auth';

const externalSnapshotSchema = z.object({
  kind: z.literal('external'),
  workerId: z.string().min(1),
  userType: z.literal('external'),
  plate: z.string().min(1),
});

const internalSnapshotSchema = z.object({
  kind: z.literal('internal'),
  workerId: z.string().min(1),
  userType: z.literal('internal'),
  truckId: z.string().min(1),
  trailerId: z.string().nullable(),
  vehicleName: z.string().min(1),
  vehicleNumber: z.string().nullable(),
  trailerName: z.string().nullable(),
  trailerNumber: z.string().nullable(),
});

export const lastUnitSnapshotSchema = z.discriminatedUnion('kind', [
  externalSnapshotSchema,
  internalSnapshotSchema,
]);

export type LastUnitSnapshot = z.infer<typeof lastUnitSnapshotSchema>;

export type UnitReuseIntent =
  | { kind: 'external'; plate: string }
  | { kind: 'internal'; truckId: string; trailerId: string | null };

/** Parses stored JSON; anything invalid is treated as absent. */
export function parseLastUnitSnapshot(raw: string | null): LastUnitSnapshot | null {
  if (raw === null || raw.trim() === '') {
    return null;
  }
  try {
    const parsed = lastUnitSnapshotSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Returns the snapshot when it belongs to this worker and user type.
 * Internal snapshots also require the truck to still exist in the synced fleet.
 */
export function matchLastUnitSnapshot(
  snapshot: LastUnitSnapshot | null,
  options: {
    workerId: string;
    userType: UserType;
    fleetTruckIds?: ReadonlySet<string>;
  },
): LastUnitSnapshot | null {
  if (snapshot === null) {
    return null;
  }
  if (snapshot.workerId !== options.workerId || snapshot.userType !== options.userType) {
    return null;
  }
  if (snapshot.kind === 'internal') {
    const fleet = options.fleetTruckIds;
    if (fleet !== undefined && !fleet.has(snapshot.truckId)) {
      return null;
    }
  }
  return snapshot;
}

export function toUnitReuseIntent(snapshot: LastUnitSnapshot): UnitReuseIntent {
  if (snapshot.kind === 'external') {
    return { kind: 'external', plate: snapshot.plate };
  }
  return {
    kind: 'internal',
    truckId: snapshot.truckId,
    trailerId: snapshot.trailerId,
  };
}
