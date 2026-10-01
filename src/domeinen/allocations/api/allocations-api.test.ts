import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/api/http-client';
import { createLogger } from '@/shared/logging/logger';
import { createFakeClock } from '@/test/fakes';
import { createAllocationsApi } from './allocations-api';

const validRow = {
  dn_allocationid: 'alloc-1',
  statuscode: 875920000,
  statecode: 0,
  dn_IncidentId: { dn_incidentid: 'inc-1', statuscode: 1 },
};

function setup(response: unknown) {
  const requestJson = vi.fn(
    async (_path: string, schema: { parse(value: unknown): unknown }, _options?: unknown) =>
      schema.parse(response),
  );
  const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
  const logger = createLogger({ clock: createFakeClock() });
  return { api: createAllocationsApi(http, logger), requestJson, logger };
}

describe('list', () => {
  it('calls the allocations endpoint and maps the rows', async () => {
    const { api, requestJson } = setup([validRow]);

    const allocations = await api.list();

    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/allocations');
    expect(allocations).toHaveLength(1);
    expect(allocations[0]?.dn_allocationid).toBe('alloc-1');
  });

  it('logs skipped rows', async () => {
    const { api, logger } = setup([validRow, { nonsense: true }]);

    const allocations = await api.list();

    expect(allocations).toHaveLength(1);
    expect(logger.entries().some((entry) => entry.message === 'Allocation rows skipped')).toBe(
      true,
    );
  });

  it('passes the abort signal on', async () => {
    const { api, requestJson } = setup([]);
    const controller = new AbortController();

    await api.list({ signal: controller.signal });

    expect(requestJson.mock.calls[0]?.[2]).toMatchObject({ signal: controller.signal });
  });
});

describe('get', () => {
  it('fetches one allocation for the worker', async () => {
    const { api, requestJson } = setup(validRow);

    const allocation = await api.get('alloc-1');

    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/allocations/alloc-1/worker');
    expect(allocation.incident.dn_incidentid).toBe('inc-1');
  });

  it('encodes the id in the path', async () => {
    const { api, requestJson } = setup(validRow);

    await api.get('a/b c');

    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/allocations/a%2Fb%20c/worker');
  });
});

describe('services', () => {
  it('fetches the services of an incident', async () => {
    const { api, requestJson } = setup([{ statuscode: 1, statecode: 0, dn_serviceid: 's1' }]);

    const services = await api.getServicesByIncidentId('inc-1');

    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/services/by-incident-id/inc-1');
    expect(services).toHaveLength(1);
  });

  it('fetches a single service', async () => {
    const { api, requestJson } = setup({ statuscode: 1, statecode: 0, dn_serviceid: 's1' });

    const service = await api.getService('s1');

    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/services/s1');
    expect(service.dn_serviceid).toBe('s1');
  });

  it('rejects a service without a status', async () => {
    const { api } = setup({ dn_serviceid: 's1' });
    await expect(api.getService('s1')).rejects.toThrow();
  });
});

describe('accept', () => {
  it('puts the raw status code as the body', async () => {
    const http = {
      request: vi.fn(async () => undefined),
      requestJson: vi.fn(),
    } as unknown as HttpClient;
    const acceptApi = createAllocationsApi(http);

    await acceptApi.accept('alloc-1', 875920000);

    expect(http.request).toHaveBeenCalledWith('/api/allocations/alloc-1/accept', {
      method: 'PUT',
      json: 875920000,
      responseType: 'none',
    });
  });
});

describe('decline', () => {
  it('puts the chosen reason as the body', async () => {
    const http = {
      request: vi.fn(async () => undefined),
      requestJson: vi.fn(),
    } as unknown as HttpClient;
    const declineApi = createAllocationsApi(http);

    await declineApi.decline('alloc-1', 875920006);

    expect(http.request).toHaveBeenCalledWith('/api/allocations/alloc-1/decline', {
      method: 'PUT',
      json: 875920006,
      responseType: 'none',
    });
  });
});

describe('acceptService', () => {
  it('puts the raw status code as the body, one level down from an allocation', async () => {
    const http = {
      request: vi.fn(async () => undefined),
      requestJson: vi.fn(),
    } as unknown as HttpClient;
    const acceptApi = createAllocationsApi(http);

    await acceptApi.acceptService('svc-1', 875920000);

    expect(http.request).toHaveBeenCalledWith('/api/services/svc-1/accept', {
      method: 'PUT',
      json: 875920000,
      responseType: 'none',
    });
  });
});

describe('declineService', () => {
  it('puts the decline status code as the body', async () => {
    const http = {
      request: vi.fn(async () => undefined),
      requestJson: vi.fn(),
    } as unknown as HttpClient;
    const api = createAllocationsApi(http);

    await api.declineService('svc-1', 875920006);

    expect(http.request).toHaveBeenCalledWith('/api/services/svc-1/decline', {
      method: 'PUT',
      json: 875920006,
      responseType: 'none',
    });
  });
});

describe('listVehicleReleases', () => {
  function setupReleases(responsesByPath: Record<string, unknown>) {
    const requestJson = vi.fn(async (path: string, schema: { parse(value: unknown): unknown }) =>
      schema.parse(responsesByPath[path]),
    );
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    const logger = createLogger({ clock: createFakeClock() });
    return { api: createAllocationsApi(http, logger), requestJson, logger };
  }

  it('combines each location with its own assignments', async () => {
    const { api } = setupReleases({
      '/api/vehicle-releases/locations': [{ dn_locationId: 'loc-1', dn_name: 'Utrecht' }],
      '/api/vehicle-releases/loc-1/assignments': [{ dn_serviceid: 'svc-1' }],
    });

    const releases = await api.listVehicleReleases();

    expect(releases).toEqual([
      { dn_locationId: 'loc-1', dn_name: 'Utrecht', releases: [{ dn_serviceid: 'svc-1' }] },
    ]);
  });

  it('drops a location whose assignments fail to load, keeps the others', async () => {
    const requestJson = vi.fn(async (path: string, schema: { parse(value: unknown): unknown }) => {
      if (path === '/api/vehicle-releases/locations') {
        return schema.parse([
          { dn_locationId: 'loc-1', dn_name: 'Broken' },
          { dn_locationId: 'loc-2', dn_name: 'Utrecht' },
        ]);
      }
      if (path === '/api/vehicle-releases/loc-1/assignments') {
        throw new Error('network error');
      }
      return schema.parse([]);
    });
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    const logger = createLogger({ clock: createFakeClock() });
    const api = createAllocationsApi(http, logger);

    const releases = await api.listVehicleReleases();

    expect(releases).toEqual([{ dn_locationId: 'loc-2', dn_name: 'Utrecht', releases: [] }]);
    expect(
      logger
        .entries()
        .some((entry) => entry.message === 'Vehicle-release assignments could not be loaded'),
    ).toBe(true);
  });

  it('returns nothing when there are no locations', async () => {
    const { api } = setupReleases({ '/api/vehicle-releases/locations': [] });
    expect(await api.listVehicleReleases()).toEqual([]);
  });
});

describe('reassign', () => {
  it('posts to the incident, with the colleague as a path segment', async () => {
    const http = {
      request: vi.fn(async () => undefined),
      requestJson: vi.fn(),
    } as unknown as HttpClient;
    const api = createAllocationsApi(http);

    await api.reassign('inc-1', 'worker-2');

    expect(http.request).toHaveBeenCalledWith('/api/incidents/inc-1/reassign/worker-2', {
      method: 'POST',
      responseType: 'none',
    });
  });
});

describe('checkZipcode', () => {
  it('posts the zipcode and house number, and returns the formatted address', async () => {
    const requestJson = vi.fn(async (_path: string, schema: { parse(value: unknown): unknown }) =>
      schema.parse('Dorpsstraat 1, 1234 AB Voorbeeld'),
    );
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    const api = createAllocationsApi(http);

    const address = await api.checkZipcode('1234AB', 1);

    expect(address).toBe('Dorpsstraat 1, 1234 AB Voorbeeld');
    expect(requestJson).toHaveBeenCalledWith('/api/check/zipcode', expect.anything(), {
      method: 'POST',
      json: { zipcode: '1234AB', housenumber: 1 },
    });
  });
});
