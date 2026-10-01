import { hasActiveServices, type HasStatus } from '@/domeinen/services';
import { ALLOCATION_DONE_STATUS } from './status';

/**
 * A reason a berger can decline an allocation for. These come from the CRM's own list of
 * allocation statuses (the generic reference-data entity `dn_allocation_statuscode`, the same
 * mechanism as the fleet in `allocation-unit`) — there is no fixed enum, the backend can add one.
 */
export type DeclineReason = { readonly value: number; readonly text: string };

/**
 * Statuses that describe the CURRENT state of an allocation being worked on, not a reason it
 * ended — offering them as a "reason to decline" would not make sense. Ported from the old app's
 * `getDeclineOptions`, which excluded exactly this set (hardcoded, unnamed there).
 */
const NOT_A_DECLINE_REASON: ReadonlySet<number> = new Set([
  875920000, // Aanrijdend
  875920001, // Ter plaatse
  875920002, // Vervoer
  875920003, // Reeds voldoende aansturing op incident
  1, // Aangestuurd (pending — the freshly-assigned state itself)
]);

/**
 * The reasons to offer, out of everything the CRM knows about allocation statuses.
 * `allowDone` also removes "klaar met opdracht" (finishing) — the old app kept it out of the
 * list when there is no separate "finish" affordance nearby, so it is not offered twice.
 */
export function filterDeclineReasons(
  reasons: readonly DeclineReason[],
  options: { allowDone: boolean },
): DeclineReason[] {
  return reasons.filter((reason) => {
    if (NOT_A_DECLINE_REASON.has(reason.value)) {
      return false;
    }
    if (!options.allowDone && reason.value === ALLOCATION_DONE_STATUS) {
      return false;
    }
    return true;
  });
}

/**
 * An allocation cannot be declined while a service on it is actively being worked on: finish
 * that first. Ported from `AllocationDeclineScreen.handleDecline`'s `activeServices` guard.
 */
export function canDeclineAllocation(services: readonly HasStatus[] | null | undefined): boolean {
  return !hasActiveServices(services);
}
