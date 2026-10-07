import { useQuery } from '@tanstack/react-query';
import type { QueryFunctionContext } from '@tanstack/react-query';
import type { RdwApi } from '@/domeinen/rdw';
import type { AllocationsApi } from '../api/allocations-api';
import { allocationQueryStaleTime } from '../domain/query-keys';
import type { Service } from '../domain/types';
import { enrichServicesWithRdw } from '../service/enrich-services-with-rdw';
import { hydrateServices } from '../service/hydrate-services';
import { useAllocationsApi, useRdwApi } from './allocations-context';

export const serviceKeys = {
  all: ['services'] as const,
  byIncident: (incidentId: string) => [...serviceKeys.all, incidentId] as const,
};

export function createServicesQueryOptions(
  api: Pick<AllocationsApi, 'getServicesByIncidentId' | 'getService'>,
  rdwApi: Pick<RdwApi, 'lookupByRegistrationNumber'>,
  incidentId: string,
  existing: readonly Service[] | null,
) {
  return {
    queryKey: serviceKeys.byIncident(incidentId),
    queryFn: ({ signal }: QueryFunctionContext) =>
      hydrateServices(
        { api, enrich: (services, logger) => enrichServicesWithRdw(services, rdwApi, logger) },
        { incidentId, existing, signal },
      ),
    staleTime: allocationQueryStaleTime,
  };
}

/**
 * The full services of an incident — the list only carries a summary. `existing` seeds the first
 * fetch's merge (services already known from the allocations list) so a thinner response cannot
 * wipe fields already in hand; missing vehicle brands are best-effort enriched through RDW.
 */
export function useServices(incidentId: string, existing: readonly Service[] | null) {
  const api = useAllocationsApi();
  const rdwApi = useRdwApi();
  return useQuery(createServicesQueryOptions(api, rdwApi, incidentId, existing));
}
