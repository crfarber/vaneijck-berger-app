import { isIncidentFinished } from './status';
import type { Allocation } from './types';

/** Service statuses that count as done: "Hulpverlening afgerond" and "Laatste bericht". */
const COMPLETED_SERVICE_STATUSES: ReadonlySet<number> = new Set([875920005, 875920003]);

/**
 * Whether every service is done. An allocation without services is NOT finished: the services
 * may simply not be loaded yet (the list only carries a summary). The old app treated an empty
 * list as finished and offered "Finish incident" on fresh allocations.
 */
export function areAllServicesCompleted(
  services: readonly { readonly statuscode: number }[] | null | undefined,
): boolean {
  if (!services || services.length === 0) {
    return false;
  }
  return services.every((service) => COMPLETED_SERVICE_STATUSES.has(service.statuscode));
}

/** The berger can close the incident: it is finished at the CRM or all its services are done. */
export function isAllocationFinished(
  allocation: Pick<Allocation, 'incident' | 'services'>,
): boolean {
  return (
    isIncidentFinished(allocation.incident.statuscode) ||
    areAllServicesCompleted(allocation.services)
  );
}
