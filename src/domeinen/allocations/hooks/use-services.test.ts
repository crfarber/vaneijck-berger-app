import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RdwApi } from '@/domeinen/rdw';
import { createStatusOverlay } from '@/shared/feedback/status-overlay';
import { createFakeScheduler, deferred } from '@/test/fakes';
import type { AllocationsApi } from '../api/allocations-api';
import { allocationQueryStaleTime } from '../domain/query-keys';
import type { Service } from '../domain/types';
import { createServicesQueryOptions, showServicesRefresh } from './use-services';

afterEach(() => {
  vi.useRealTimers();
});

describe('services query options', () => {
  function setupRefresh() {
    const response = deferred<Service[]>();
    const getServicesByIncidentId = vi.fn(() => response.promise);
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
    const overlay = createStatusOverlay({
      scheduler: createFakeScheduler(),
      haptics: { tap: vi.fn(), notify: vi.fn() },
    });
    return { response, getServicesByIncidentId, options, client, overlay };
  }

  it('blocks stale services until the existing refresh finishes without a second request', async () => {
    const { response, getServicesByIncidentId, options, client, overlay } = setupRefresh();
    client.setQueryData(options.queryKey, [], { updatedAt: 1 });
    const fetch = client.fetchQuery(options);
    const processing = showServicesRefresh(client, 'incident-1', overlay, 'Loading services');

    expect(overlay.store.getState().current).toMatchObject({ phase: 'processing' });
    response.resolve([]);
    await fetch;
    await processing;

    expect(overlay.store.getState().current).toBeNull();
    expect(getServicesByIncidentId).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('closes the refresh overlay on failure and leaves the error in the query', async () => {
    const { response, options, client, overlay } = setupRefresh();
    client.setQueryData(options.queryKey, [], { updatedAt: 1 });
    const fetch = client.fetchQuery(options).catch(() => undefined);
    const processing = showServicesRefresh(client, 'incident-1', overlay, 'Loading services');
    const error = new Error('Refresh failed');

    response.reject(error);
    await fetch;
    await processing;

    expect(overlay.store.getState().current).toBeNull();
    expect(client.getQueryState(options.queryKey)?.error).toBe(error);
    client.clear();
  });

  it('does not block fresh cached services or a missing query', async () => {
    const { options, client, overlay } = setupRefresh();
    await showServicesRefresh(client, 'incident-1', overlay, 'Loading services');
    expect(overlay.store.getState().current).toBeNull();

    client.setQueryData(options.queryKey, []);
    await showServicesRefresh(client, 'incident-1', overlay, 'Loading services');
    expect(overlay.store.getState().current).toBeNull();
    client.clear();
  });

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
