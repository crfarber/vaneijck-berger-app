import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RdwApi } from '@/domeinen/rdw';
import type { AllocationsApi } from '../api/allocations-api';
import { allocationQueryStaleTime } from '../domain/query-keys';
import type { Service } from '../domain/types';
import { createServicesQueryOptions } from './use-services';

afterEach(() => {
  vi.useRealTimers();
});

describe('services query options', () => {
  it('reuses services when navigating back within the stale window', async () => {
    vi.useFakeTimers();
    const getServicesByIncidentId = vi.fn(async () => []);
    const options = createServicesQueryOptions(
      {
        getServicesByIncidentId,
        getService: async () => {
          throw new Error('Unexpected service detail request');
        },
      },
      { lookupByRegistrationNumber: async () => null },
      'incident-1',
      null,
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await client.fetchQuery(options);
    vi.advanceTimersByTime(allocationQueryStaleTime - 1);
    await client.fetchQuery(options);
    expect(getServicesByIncidentId).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await client.fetchQuery(options);
    expect(getServicesByIncidentId).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('returns and caches RDW-enriched services', async () => {
    const service: Service = {
      dn_serviceid: 'service-1',
      dn_concatlicenseplate: 'AB123C',
      statuscode: 875920000,
      statecode: 0,
    };
    const api: Pick<AllocationsApi, 'getServicesByIncidentId' | 'getService'> = {
      getServicesByIncidentId: vi.fn(async () => [service]),
      getService: vi.fn(async () => service),
    };
    const rdwApi: RdwApi = {
      lookupByRegistrationNumber: vi.fn(async () => ({
        model: 'Nissan',
        tradeName: 'Juke',
        primaryColor: 'Zwart',
      })),
    };
    const client = new QueryClient();
    const options = createServicesQueryOptions(api, rdwApi, 'incident-1', null);

    const result = await client.fetchQuery(options);

    expect(result[0]).toMatchObject({
      dn_vehiclebrand: 'Nissan',
      dn_vehicletradename: 'Juke',
      dn_vwe_vehicleinformationid: { vwe_rdw_kleur1: 'Zwart' },
    });
    expect(client.getQueryData(options.queryKey)).toEqual(result);
    client.clear();
  });
});
