import type { ReregisterOutcome, ReregisterReason } from './reregister';

/**
 * What the "change vehicle" button should do after a fresh `decideReregister` / `checkReregister`.
 * Only active work blocks a change; with pending assignments alone the berger may switch vehicle,
 * as in the old app (open question 32).
 */
export type ChangeVehicleDecision =
  | { action: 'call-dispatch' }
  | { action: 'alert'; reason: 'no-vehicle' | 'active-work' }
  | { action: 'confirm-then-register'; reason: Exclude<ReregisterReason, 'expired'> }
  | { action: 'extend-shift' }
  | { action: 'register' };

export function decideChangeVehicle(
  outcome: ReregisterOutcome,
  hasActiveAllocations: boolean,
): ChangeVehicleDecision {
  if (outcome.kind === 'blocked') {
    return outcome.reason === 'no-unit'
      ? { action: 'call-dispatch' }
      : { action: 'alert', reason: 'no-vehicle' };
  }

  if (outcome.kind === 'required') {
    // Shift expired but the vehicle is still there: only refresh the end time (old SetWorkingHours).
    if (outcome.reason === 'expired') {
      return { action: 'extend-shift' };
    }
    return { action: 'confirm-then-register', reason: outcome.reason };
  }

  // not-needed: the old app still opened SelectTransport. The backend refuses a unit change
  // while work is in progress (ACTIVE_INCIDENT), so warn first instead of a failing form.
  if (hasActiveAllocations) {
    return { action: 'alert', reason: 'active-work' };
  }

  return { action: 'register' };
}
