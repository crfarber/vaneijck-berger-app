/**
 * CRM status codes of allocations and incidents. The old app only had commented lists for
 * these; the names here are the Dutch labels from those comments.
 */

/** Allocation statuses that show up as "active" in the overview. */
const ALLOCATION_ACTIVE: ReadonlySet<number> = new Set([
  875920000, // Aanrijdend
  875920001, // Ter plaatse
  875920002, // Vervoer
  875920007, // Ander incident met PRIO (reassign pending)
  2, // Abusievelijk aangestuurd
  875920003, // Reeds voldoende aansturing op incident
  875920015, // Ondersteuning verleend
  875920004, // Andere eenheid sneller op incidentlocatie
  875920005, // In overleg met planning geweigerd
  875920006, // Medewerker niet beschikbaar
  875920008, // Geen diensten meer in incident
  875920010, // Medewerker met pauze
  875920011, // Medewerker einde dienst
  875920012, // Zelf met pech/schade gestrand
  875920013, // Geen geschikt hulpverleningsvoertuig
  875920016, // Van voertuig gewisseld
]);

/** Allocation statuses that wait for the berger to accept ("Aangestuurd"). */
const ALLOCATION_PENDING: ReadonlySet<number> = new Set([1]);

export const ALLOCATION_REASSIGN_PENDING = 875920007;

/**
 * "Finishing" an allocation is not a separate endpoint: the old app submits this status through
 * the same decline call (`PUT .../decline`) that rejects it for a real reason.
 */
export const ALLOCATION_DONE_STATUS = 875920014;

/** The status accept always uses; the endpoint lets it be arbitrary, but the app never varies it. */
export const ALLOCATION_ACCEPT_STATUS = 875920000;

export type AllocationListBucket = 'active' | 'pending' | 'hidden';

/**
 * Where an allocation goes in the overview. Closed allocations (statecode other than 0) are
 * hidden, except when the allocation is waiting to be handed over to another unit.
 */
export function classifyAllocation(allocation: {
  statuscode: number;
  statecode: number;
}): AllocationListBucket {
  const isReassignPending = allocation.statuscode === ALLOCATION_REASSIGN_PENDING;
  if (allocation.statecode !== 0 && !isReassignPending) {
    return 'hidden';
  }
  if (ALLOCATION_PENDING.has(allocation.statuscode)) {
    return 'pending';
  }
  if (ALLOCATION_ACTIVE.has(allocation.statuscode)) {
    return 'active';
  }
  return 'hidden';
}

export const INCIDENT_STATUS = {
  NEW: 1,
  FORWARDED: 875920007,
  ACCEPTED: 875920000,
  IN_PROGRESS: 875920001,
  ARRIVED: 875920002,
  LAST_DEPARTURE: 875920003,
  CLOSED: 2,
  CANCELLED: 875920004,
  MERGED: 875920005,
} as const;

/** The incident has had its last departure: nothing left to do for the berger. */
export function isIncidentFinished(statuscode: number | undefined): boolean {
  return statuscode === INCIDENT_STATUS.LAST_DEPARTURE;
}
