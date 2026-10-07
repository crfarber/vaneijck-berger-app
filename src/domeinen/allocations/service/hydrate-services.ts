import type { Logger } from '@/shared/logging/logger';
import type { AllocationsApi } from '../api/allocations-api';
import { mergeHydratedServices } from '../domain/merge';
import type { Service } from '../domain/types';

export type HydrateServicesDeps = {
  api: Pick<AllocationsApi, 'getServicesByIncidentId' | 'getService'>;
  /** Adds vehicle data (RDW) to the services. Optional: without it the services are returned as fetched. */
  enrich?: (services: Service[], logger?: Logger) => Promise<Service[]>;
  logger?: Logger;
};

export type HydrateServicesInput = {
  incidentId: string;
  /** What we already know about the services, from the list summary or an earlier fetch. */
  existing?: readonly Service[] | null;
  signal?: AbortSignal;
};

const lacksTypeCode = (service: Service): boolean =>
  service.dn_servicetypecode === undefined || service.dn_servicetypecode === null;

/**
 * Loads the complete services of an incident. The overview only carries a summary; this is the
 * fetch that runs when the berger opens an allocation.
 *
 * - The fetched list decides which services exist; each is merged with what we already had.
 * - The by-incident endpoint sometimes leaves out the type code. For those services only, the
 *   service is fetched by id. A failure there is logged and skipped; it must not block opening.
 */
export async function hydrateServices(
  deps: HydrateServicesDeps,
  { incidentId, existing, signal }: HydrateServicesInput,
): Promise<Service[]> {
  const incoming = await deps.api.getServicesByIncidentId(incidentId, { signal });
  let services = mergeHydratedServices(existing, incoming);

  const missing = services.flatMap((service) =>
    service.dn_serviceid && lacksTypeCode(service) ? [service.dn_serviceid] : [],
  );

  if (missing.length > 0) {
    const results = await Promise.allSettled(
      missing.map((id) => deps.api.getService(id, { signal })),
    );
    const detailById = new Map<string, Service>();

    results.forEach((result, index) => {
      const id = missing[index];
      if (id === undefined) {
        return;
      }
      if (result.status === 'fulfilled') {
        detailById.set(id, result.value);
      } else {
        deps.logger?.warn('sync', 'Service detail could not be fetched', { serviceId: id });
      }
    });

    services = services.map((service) => {
      const detail = service.dn_serviceid ? detailById.get(service.dn_serviceid) : undefined;
      return detail ? { ...service, ...detail } : service;
    });
  }

  return deps.enrich ? deps.enrich(services, deps.logger) : services;
}
