import { useQuery } from '@tanstack/react-query';
import type { Service } from '../domain/types';
import { hydrateServices } from '../service/hydrate-services';
import { useAllocationsApi } from './allocations-context';

export const serviceKeys = {
  all: ['services'] as const,
  byIncident: (incidentId: string) => [...serviceKeys.all, incidentId] as const,
};

/**
 * The full services of an incident — the list only carries a summary. `existing` seeds the first
 * fetch's merge (services already known from the allocations list) so a thinner response cannot
 * wipe fields already in hand; RDW enrichment is not wired in yet (open item, see roadmap slice 5).
 */
export function useServices(incidentId: string, existing: readonly Service[] | null) {
  const api = useAllocationsApi();
  return useQuery({
    queryKey: serviceKeys.byIncident(incidentId),
    queryFn: ({ signal }) => hydrateServices({ api }, { incidentId, existing, signal }),
  });
}
