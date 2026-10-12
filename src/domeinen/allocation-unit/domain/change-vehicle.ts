import type { ReregisterOutcome, ReregisterReason } from './reregister';

/**
 * What the "change vehicle" toolbar button should do after a fresh `decideReregister` /
 * `checkReregister`. Active work no longer blocks opening the current-unit overview; that guard
 * lives on the overview's edit actions (backend still refuses `ACTIVE_INCIDENT`).
 */
export type ChangeVehicleDecision =
  | { action: 'call-dispatch' }
  | { action: 'alert'; reason: 'no-vehicle' }
  | { action: 'confirm-then-register'; reason: Exclude<ReregisterReason, 'expired'> }
  | { action: 'extend-shift' }
  | { action: 'open-overview' };

export function decideChangeVehicle(outcome: ReregisterOutcome): ChangeVehicleDecision {
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

  // not-needed: open the current-unit overview; edit actions there guard against active work.
  return { action: 'open-overview' };
}
