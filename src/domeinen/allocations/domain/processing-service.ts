import { findReleaseAssignment, releaseScopeId, toReleaseService } from './release-service';
import type { Allocation, Service, VehicleReleaseLocation } from './types';

export type ResolveProcessingServiceInput = {
  allocations: readonly Allocation[];
  vehicleReleases?: readonly VehicleReleaseLocation[];
  fetchedServices: readonly Service[] | undefined;
  allocationId: string;
  serviceId: string;
  locationId?: string;
};

export type ResolvedProcessingService = {
  isReleaseItem: boolean;
  scopeId: string;
  allocation: Allocation | undefined;
  service: Service | undefined;
  services: readonly Service[];
  incidentId: string;
};

/**
 * Resolves the allocation or locatie-afgifte row for a processing screen (form or photos).
 * With `locationId`, the service comes from vehicle releases; otherwise from the allocation.
 */
export function resolveProcessingService(
  input: ResolveProcessingServiceInput,
): ResolvedProcessingService {
  if (input.locationId !== undefined && input.locationId !== '') {
    const assignment = findReleaseAssignment(
      input.vehicleReleases ?? [],
      input.locationId,
      input.serviceId,
    );
    const service = assignment ? toReleaseService(assignment) : undefined;
    const incidentId =
      typeof assignment?._dn_incidentid_value === 'string' ? assignment._dn_incidentid_value : '';
    return {
      isReleaseItem: true,
      scopeId: releaseScopeId(input.serviceId),
      allocation: undefined,
      service,
      services: [],
      incidentId,
    };
  }

  const allocation = input.allocations.find((item) => item.dn_allocationid === input.allocationId);
  const services = input.fetchedServices ?? allocation?.services ?? [];
  const service = services.find((item) => item.dn_serviceid === input.serviceId);

  return {
    isReleaseItem: false,
    scopeId: input.allocationId,
    allocation,
    service,
    services,
    incidentId: allocation?.incident.dn_incidentid ?? '',
  };
}
