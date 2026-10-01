/**
 * Whether the berger must (re-)register their unit. Ported from the old app's
 * `useForceUserReregister`, with its exact branches — including the one asymmetry: an expired
 * shift with active allocations needs nothing (the old app's own outcome for that combination),
 * while a missing unit or vehicle with active allocations is `blocked`, not `not-needed`. Both
 * `blocked` and `not-needed` mean the same thing for navigation (stay on the allocations screen);
 * `blocked` is kept as its own case because a future "change unit" action can use it to explain why
 * it can't proceed right now, which is more than this slice builds.
 */
export type ReregisterReason = 'no-unit' | 'no-vehicle' | 'expired';

export type ReregisterOutcome =
  | { kind: 'not-needed'; expiredWithActiveWork?: true }
  | { kind: 'blocked'; reason: ReregisterReason }
  | { kind: 'required'; reason: ReregisterReason };

/** The parts of the current unit this decision needs. Null means no unit exists at all. */
export type CurrentUnitForReregister = {
  /** External: a plate is set. Internal: a vehicle id is set. */
  hasVehicle: boolean;
  /** Epoch milliseconds, or null when never set. */
  validUntil: number | null;
} | null;

export function decideReregister(
  unit: CurrentUnitForReregister,
  options: { hasActiveAllocations: boolean; now: number },
): ReregisterOutcome {
  const { hasActiveAllocations, now } = options;

  if (unit === null) {
    return hasActiveAllocations
      ? { kind: 'blocked', reason: 'no-unit' }
      : { kind: 'required', reason: 'no-unit' };
  }

  if (!unit.hasVehicle) {
    return hasActiveAllocations
      ? { kind: 'blocked', reason: 'no-vehicle' }
      : { kind: 'required', reason: 'no-vehicle' };
  }

  const expired = unit.validUntil === null || now > unit.validUntil;
  if (expired) {
    return hasActiveAllocations
      ? { kind: 'not-needed', expiredWithActiveWork: true }
      : { kind: 'required', reason: 'expired' };
  }

  return { kind: 'not-needed' };
}
