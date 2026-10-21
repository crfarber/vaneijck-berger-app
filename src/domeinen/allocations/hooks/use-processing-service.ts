import { useMemo } from 'react';
import {
  resolveProcessingService,
  type ResolvedProcessingService,
} from '../domain/processing-service';
import { useAllocations } from './use-allocations';
import { useServices } from './use-services';

export type UseProcessingServiceResult = ResolvedProcessingService & {
  allocationsPending: boolean;
  servicesPending: boolean;
};

/**
 * Loads allocations (and vehicle releases) and, when needed, hydrated services, then resolves
 * the row for a processing screen — allocation or locatie-afgifte.
 */
export function useProcessingService({
  allocationId,
  serviceId,
  locationId,
}: {
  allocationId: string;
  serviceId: string;
  locationId?: string;
}): UseProcessingServiceResult {
  const isReleaseItem = locationId !== undefined && locationId !== '';
  const { sections, isPending: allocationsPending } = useAllocations();
  const [active, pending, vehicleReleases] = sections;
  const allocations = useMemo(() => [...active.data, ...pending.data], [active.data, pending.data]);
  const allocation = isReleaseItem
    ? undefined
    : allocations.find((item) => item.dn_allocationid === allocationId);
  const incidentId = allocation?.incident.dn_incidentid ?? '';
  const servicesQuery = useServices(incidentId, allocation?.services ?? null, {
    enabled: !isReleaseItem && incidentId !== '',
  });
  const resolved = resolveProcessingService({
    allocations,
    vehicleReleases: vehicleReleases.data,
    fetchedServices: servicesQuery.data,
    allocationId,
    serviceId,
    locationId,
  });

  return {
    ...resolved,
    allocationsPending,
    servicesPending: isReleaseItem ? false : servicesQuery.isPending,
  };
}
