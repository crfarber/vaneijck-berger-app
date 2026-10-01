import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import { DEFAULT_AVAILABILITY } from '../domain/availability';
import { createAllocationUnitApi } from './allocation-unit-api';

function setup(response: unknown) {
  const requestJson = vi.fn(
    async (_path: string, schema: { parse(value: unknown): unknown }, _options?: unknown) =>
      schema.parse(response),
  );
  const request = vi.fn(async () => undefined);
  const http = { request, requestJson } as unknown as HttpClient;
  return { api: createAllocationUnitApi(http), request, requestJson };
}

describe('getCurrent', () => {
  it('returns the parsed unit', async () => {
    const { api, requestJson } = setup({
      id: 'unit-1',
      alternateVehicleRegistrationNumber: 'AB-12-CD',
      validUntil: '2026-09-22T20:00:00.000Z',
    });

    expect(await api.getCurrent()).toEqual({
      id: 'unit-1',
      alternateVehicleRegistrationNumber: 'AB-12-CD',
      validUntil: '2026-09-22T20:00:00.000Z',
    });
    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/allocation-units');
  });

  it('returns null when there is no unit yet (404)', async () => {
    const requestJson = vi.fn(async () => {
      throw new HttpError(404, null, '');
    });
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    const api = createAllocationUnitApi(http);

    expect(await api.getCurrent()).toBeNull();
  });

  it('returns null when the backend answers 2xx with an empty body (tst does this instead of 404)', async () => {
    const { api } = setup(undefined);

    expect(await api.getCurrent()).toBeNull();
  });

  it('returns null when the body is JSON null', async () => {
    const { api } = setup(null);

    expect(await api.getCurrent()).toBeNull();
  });

  it('lets any other error propagate', async () => {
    const requestJson = vi.fn(async () => {
      throw new HttpError(500, null, '');
    });
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    const api = createAllocationUnitApi(http);

    await expect(api.getCurrent()).rejects.toThrow(HttpError);
  });
});

describe('registerExternal', () => {
  it('posts the plate, end date and availability', async () => {
    const { api, request } = setup(null);

    await api.registerExternal({
      plateNumber: 'AB-12-CD',
      validUntil: '2026-09-22T20:00:00.000Z',
      availability: { ...DEFAULT_AVAILABILITY, notAvailableForIM: true },
    });

    expect(request).toHaveBeenCalledWith('/api/allocation-units/externalworker', {
      method: 'POST',
      json: {
        alternateVehicleRegistrationNumber: 'AB-12-CD',
        validUntil: '2026-09-22T20:00:00.000Z',
        notAvailableForIM: true,
        onlyAvailableForTransport: false,
        onlyAvailableForBreakdown: false,
        notAvailableForAllocation: false,
      },
      responseType: 'none',
    });
  });
});

describe('updateExternal', () => {
  it('patches the same fields', async () => {
    const { api, request } = setup(null);

    await api.updateExternal({
      plateNumber: 'AB-12-CD',
      validUntil: '2026-09-22T20:00:00.000Z',
      availability: DEFAULT_AVAILABILITY,
    });

    expect(request).toHaveBeenCalledWith(
      '/api/allocation-units',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('registerInternal', () => {
  it('posts the vehicle, trailer, end date and availability', async () => {
    const { api, request } = setup(null);

    await api.registerInternal({
      vehicleId: 'truck-1',
      trailerId: 'trailer-1',
      validUntil: '2026-09-22T20:00:00.000Z',
      availability: { ...DEFAULT_AVAILABILITY, onlyAvailableForBreakdown: true },
    });

    expect(request).toHaveBeenCalledWith('/api/allocation-units/internalworker', {
      method: 'POST',
      json: {
        vehicleId: 'truck-1',
        trailerId: 'trailer-1',
        validUntil: '2026-09-22T20:00:00.000Z',
        notAvailableForIM: false,
        onlyAvailableForTransport: false,
        onlyAvailableForBreakdown: true,
        notAvailableForAllocation: false,
      },
      responseType: 'none',
    });
  });

  it('sends a null trailer when the berger has none', async () => {
    const { api, request } = setup(null);

    await api.registerInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      validUntil: '2026-09-22T20:00:00.000Z',
      availability: DEFAULT_AVAILABILITY,
    });

    expect(request).toHaveBeenCalledWith(
      '/api/allocation-units/internalworker',
      expect.objectContaining({ json: expect.objectContaining({ trailerId: null }) }),
    );
  });

  it('sends the chosen homebase location', async () => {
    const { api, request } = setup(null);

    await api.registerInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      validUntil: '2026-09-22T20:00:00.000Z',
      availability: DEFAULT_AVAILABILITY,
      homebaseLocationId: 'loc-1',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/allocation-units/internalworker',
      expect.objectContaining({
        json: expect.objectContaining({ homebaseLocationId: 'loc-1' }),
      }),
    );
  });
});

describe('updateInternal', () => {
  it('patches the same fields', async () => {
    const { api, request } = setup(null);

    await api.updateInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      validUntil: '2026-09-22T20:00:00.000Z',
      availability: DEFAULT_AVAILABILITY,
    });

    expect(request).toHaveBeenCalledWith(
      '/api/allocation-units',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('patches the homebase location when given', async () => {
    const { api, request } = setup(null);

    await api.updateInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      validUntil: '2026-09-22T20:00:00.000Z',
      availability: DEFAULT_AVAILABILITY,
      homebaseLocationId: 'loc-1',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/allocation-units',
      expect.objectContaining({
        method: 'PATCH',
        json: expect.objectContaining({ homebaseLocationId: 'loc-1' }),
      }),
    );
  });

  it('leaves the homebase location out when absent', async () => {
    const { api, request } = setup(null);

    await api.updateInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      validUntil: '2026-09-22T20:00:00.000Z',
      availability: DEFAULT_AVAILABILITY,
    });

    const options = (request.mock.calls[0] as unknown[] | undefined)?.[1] as
      { json: Record<string, unknown> } | undefined;
    expect(options?.json).not.toHaveProperty('homebaseLocationId');
  });
});

describe('cancel', () => {
  it('posts to the cancel path with the unit id', async () => {
    const { api, request } = setup(null);

    await api.cancel('unit-42');

    expect(request).toHaveBeenCalledWith('/api/allocation-units/unit-42/cancel', {
      method: 'POST',
      responseType: 'none',
    });
  });

  it('encodes the id in the path', async () => {
    const { api, request } = setup(null);

    await api.cancel('a/b');

    expect(request).toHaveBeenCalledWith(
      '/api/allocation-units/a%2Fb/cancel',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
