import { describe, expect, it, vi } from 'vitest';
import type { ReferenceDataService } from '@/domeinen/reference-data';
import { HttpError } from '@/shared/api/errors';
import { createFakeClock } from '@/test/fakes';
import type { AllocationUnitApi } from '../api/allocation-unit-api';
import { DEFAULT_AVAILABILITY } from '../domain/availability';
import { classifyRegistrationError, createAllocationUnitService } from './allocation-unit-service';

const NOW = Date.UTC(2026, 8, 22, 12, 0, 0);

function setup(
  overrides: Partial<AllocationUnitApi> = {},
  referenceDataOverrides: Partial<ReferenceDataService> = {},
) {
  const api: AllocationUnitApi = {
    getCurrent: vi.fn(async () => null),
    registerExternal: vi.fn(async () => undefined),
    updateExternal: vi.fn(async () => undefined),
    registerInternal: vi.fn(async () => undefined),
    updateInternal: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
    ...overrides,
  };
  const referenceDataService: ReferenceDataService = {
    sync: vi.fn(async () => ({ synced: [], failed: [] })),
    getSyncStatus: vi.fn(() => ({ phase: 'idle' as const, synced: [], failed: [], topics: [] })),
    subscribeToSyncStatus: vi.fn(() => () => undefined),
    getEntity: vi.fn(async () => null),
    listEntities: vi.fn(async () => []),
    refreshEntity: vi.fn(async () => undefined),
    abortPending: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
    ...referenceDataOverrides,
  };
  const clock = createFakeClock(NOW);
  const service = createAllocationUnitService({ api, referenceDataService, clock });
  return { service, api, referenceDataService, clock };
}

describe('registerExternal', () => {
  it('registers a new unit when none exists', async () => {
    const { service, api } = setup({ getCurrent: vi.fn(async () => null) });
    const endDate = new Date(NOW + 8 * 3_600_000);

    const result = await service.registerExternal({
      plateNumber: 'AB-12-CD',
      endDate,
      availability: DEFAULT_AVAILABILITY,
    });

    expect(result).toEqual({ ok: true, value: undefined });
    expect(api.registerExternal).toHaveBeenCalledWith({
      plateNumber: 'AB-12-CD',
      validUntil: endDate.toISOString(),
      availability: DEFAULT_AVAILABILITY,
    });
    expect(api.updateExternal).not.toHaveBeenCalled();
  });

  it('updates the existing unit instead of registering a new one', async () => {
    const { service, api } = setup({
      getCurrent: vi.fn(async () => ({ alternateVehicleRegistrationNumber: 'OLD-01-D' })),
    });

    await service.registerExternal({
      plateNumber: 'AB-12-CD',
      endDate: new Date(NOW),
      availability: DEFAULT_AVAILABILITY,
    });

    expect(api.updateExternal).toHaveBeenCalled();
    expect(api.registerExternal).not.toHaveBeenCalled();
  });

  it('reports a failure without throwing', async () => {
    const { service } = setup({
      registerExternal: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    const result = await service.registerExternal({
      plateNumber: 'AB-12-CD',
      endDate: new Date(NOW),
      availability: DEFAULT_AVAILABILITY,
    });

    expect(result).toEqual({ ok: false, error: 'request-failed' });
  });

  it('reports active-incident when the backend refuses because of open work', async () => {
    const { service } = setup({
      registerExternal: vi.fn(async () => {
        throw new HttpError(400, { detail: 'ACTIVE_INCIDENT' });
      }),
    });

    const result = await service.registerExternal({
      plateNumber: 'AB-12-CD',
      endDate: new Date(NOW),
      availability: DEFAULT_AVAILABILITY,
    });

    expect(result).toEqual({ ok: false, error: 'active-incident' });
  });
});

describe('registerInternal', () => {
  it('registers a new unit when none exists', async () => {
    const { service, api } = setup({ getCurrent: vi.fn(async () => null) });
    const endDate = new Date(NOW + 8 * 3_600_000);

    const result = await service.registerInternal({
      vehicleId: 'truck-1',
      trailerId: 'trailer-1',
      endDate,
      availability: DEFAULT_AVAILABILITY,
      homebaseLocationId: 'loc-1',
    });

    expect(result).toEqual({ ok: true, value: undefined });
    expect(api.registerInternal).toHaveBeenCalledWith({
      vehicleId: 'truck-1',
      trailerId: 'trailer-1',
      validUntil: endDate.toISOString(),
      availability: DEFAULT_AVAILABILITY,
      homebaseLocationId: 'loc-1',
    });
    expect(api.updateInternal).not.toHaveBeenCalled();
  });

  it('updates the existing unit instead of registering a new one', async () => {
    const { service, api } = setup({
      getCurrent: vi.fn(async () => ({ vehicleId: 'old-truck' })),
    });

    await service.registerInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      endDate: new Date(NOW),
      availability: DEFAULT_AVAILABILITY,
      homebaseLocationId: 'loc-1',
    });

    expect(api.updateInternal).toHaveBeenCalledWith(
      expect.objectContaining({ homebaseLocationId: 'loc-1' }),
    );
    expect(api.registerInternal).not.toHaveBeenCalled();
  });

  it('reports a failure without throwing', async () => {
    const { service } = setup({
      registerInternal: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    const result = await service.registerInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      endDate: new Date(NOW),
      availability: DEFAULT_AVAILABILITY,
      homebaseLocationId: 'loc-1',
    });

    expect(result).toEqual({ ok: false, error: 'request-failed' });
  });

  it('reports active-incident when the backend refuses because of open work', async () => {
    const { service } = setup({
      registerInternal: vi.fn(async () => {
        throw new HttpError(400, { detail: 'ACTIVE_INCIDENT' });
      }),
    });

    const result = await service.registerInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      endDate: new Date(NOW),
      availability: DEFAULT_AVAILABILITY,
      homebaseLocationId: 'loc-1',
    });

    expect(result).toEqual({ ok: false, error: 'active-incident' });
  });
});

describe('classifyRegistrationError', () => {
  it('recognises ACTIVE_INCIDENT from ProblemDetails.detail', () => {
    expect(classifyRegistrationError(new HttpError(400, { detail: 'ACTIVE_INCIDENT' }))).toBe(
      'active-incident',
    );
  });

  it('treats any other failure as request-failed', () => {
    expect(classifyRegistrationError(new HttpError(400, { detail: 'OTHER' }))).toBe(
      'request-failed',
    );
    expect(classifyRegistrationError(new HttpError(500, null))).toBe('request-failed');
    expect(classifyRegistrationError(new Error('boom'))).toBe('request-failed');
  });
});

describe('checkReregister', () => {
  it('combines the current unit with the clock to decide', async () => {
    const { service } = setup({
      getCurrent: vi.fn(async () => ({
        alternateVehicleRegistrationNumber: 'AB-12-CD',
        validUntil: new Date(NOW - 1000).toISOString(),
      })),
    });

    expect(await service.checkReregister(false)).toEqual({ kind: 'required', reason: 'expired' });
  });

  it('treats no unit as requiring registration', async () => {
    const { service } = setup({ getCurrent: vi.fn(async () => null) });

    expect(await service.checkReregister(false)).toEqual({ kind: 'required', reason: 'no-unit' });
  });

  it('recognises an internal unit by its vehicle id, not just the external plate field', async () => {
    const { service } = setup({
      getCurrent: vi.fn(async () => ({
        vehicleId: 'truck-1',
        validUntil: new Date(NOW + 3_600_000).toISOString(),
      })),
    });

    // Before the fix this fell through to `hasVehicle: false` for every internal unit, because
    // only `alternateVehicleRegistrationNumber` (the external field) was checked.
    expect(await service.checkReregister(false)).toEqual({ kind: 'not-needed' });
  });
});

describe('extendShift', () => {
  it('patches an external unit keeping the plate and availability', async () => {
    const { service, api } = setup({
      getCurrent: vi.fn(async () => ({
        alternateVehicleRegistrationNumber: 'AB-12-CD',
        validUntil: new Date(NOW - 1000).toISOString(),
        notAvailableForIM: true,
      })),
    });
    const endDate = new Date(NOW + 8 * 3_600_000);

    expect(await service.extendShift(endDate)).toEqual({ ok: true, value: undefined });
    expect(api.updateExternal).toHaveBeenCalledWith({
      plateNumber: 'AB-12-CD',
      validUntil: endDate.toISOString(),
      availability: { ...DEFAULT_AVAILABILITY, notAvailableForIM: true },
    });
    expect(api.updateInternal).not.toHaveBeenCalled();
  });

  it('patches an internal unit keeping vehicle and trailer', async () => {
    const { service, api } = setup({
      getCurrent: vi.fn(async () => ({
        vehicleId: 'truck-1',
        trailerId: 'trailer-1',
        validUntil: new Date(NOW - 1000).toISOString(),
      })),
    });
    const endDate = new Date(NOW + 8 * 3_600_000);

    expect(await service.extendShift(endDate)).toEqual({ ok: true, value: undefined });
    expect(api.updateInternal).toHaveBeenCalledWith({
      vehicleId: 'truck-1',
      trailerId: 'trailer-1',
      validUntil: endDate.toISOString(),
      availability: DEFAULT_AVAILABILITY,
    });
  });

  it('sends the chosen homebase with an internal unit', async () => {
    const { service, api } = setup({
      getCurrent: vi.fn(async () => ({ vehicleId: 'truck-1' })),
    });

    await service.extendShift(new Date(NOW + 1000), { homebaseLocationId: 'loc-1' });

    expect(api.updateInternal).toHaveBeenCalledWith(
      expect.objectContaining({ homebaseLocationId: 'loc-1' }),
    );
  });

  it('never sends a homebase with an external unit', async () => {
    const { service, api } = setup({
      getCurrent: vi.fn(async () => ({ alternateVehicleRegistrationNumber: 'AB-12-CD' })),
    });

    await service.extendShift(new Date(NOW + 1000), { homebaseLocationId: 'loc-1' });

    expect(api.updateExternal).toHaveBeenCalledWith(
      expect.not.objectContaining({ homebaseLocationId: expect.anything() }),
    );
  });

  it('reports no-unit when there is nothing to extend', async () => {
    const { service } = setup({ getCurrent: vi.fn(async () => null) });
    expect(await service.extendShift(new Date(NOW + 1000))).toEqual({
      ok: false,
      error: 'no-unit',
    });
  });
});

describe('cancelCurrentUnit', () => {
  it('succeeds without calling cancel when there is no unit', async () => {
    const { service, api } = setup({ getCurrent: vi.fn(async () => null) });

    expect(await service.cancelCurrentUnit()).toEqual({ ok: true, value: undefined });
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('cancels the current unit by its id', async () => {
    const { service, api } = setup({
      getCurrent: vi.fn(async () => ({
        id: 'unit-1',
        alternateVehicleRegistrationNumber: 'AB-12-CD',
      })),
    });

    expect(await service.cancelCurrentUnit()).toEqual({ ok: true, value: undefined });
    expect(api.cancel).toHaveBeenCalledWith('unit-1');
  });

  it('reports missing-id when the unit has no id', async () => {
    const { service, api } = setup({
      getCurrent: vi.fn(async () => ({ alternateVehicleRegistrationNumber: 'AB-12-CD' })),
    });

    expect(await service.cancelCurrentUnit()).toEqual({ ok: false, error: 'missing-id' });
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('reports cancel-failed when the backend rejects the request', async () => {
    const { service } = setup({
      getCurrent: vi.fn(async () => ({ id: 'unit-1' })),
      cancel: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    expect(await service.cancelCurrentUnit()).toEqual({ ok: false, error: 'cancel-failed' });
  });
});

describe('getFleet', () => {
  it('returns an empty list when reference-data has not synced it yet', async () => {
    const { service } = setup({}, { getEntity: vi.fn(async () => null) });

    expect(await service.getFleet()).toEqual([]);
  });

  it('parses the synced rows into fleet vehicles', async () => {
    const { service, referenceDataService } = setup(
      {},
      {
        getEntity: vi.fn(async () => [
          {
            dn_fleetid: 'a',
            dn_name: 'VE-01',
            dn_vehiclenumber: '82-LTF-P',
            dn_vehicletypecode: 1001,
          },
        ]),
      },
    );

    expect(await service.getFleet()).toEqual([
      { id: 'a', name: 'VE-01', vehicleNumber: '82-LTF-P', typeCode: 1001 },
    ]);
    expect(referenceDataService.getEntity).toHaveBeenCalledWith('dn_fleets');
  });

  it('drops a row that fails to parse instead of failing the whole list', async () => {
    const { service } = setup(
      {},
      {
        getEntity: vi.fn(async () => [
          { dn_fleetid: 'a', dn_name: 'VE-01', dn_vehicletypecode: 1001 },
          { dn_name: 'broken, no id' },
        ]),
      },
    );

    expect(await service.getFleet()).toEqual([
      { id: 'a', name: 'VE-01', vehicleNumber: null, typeCode: 1001 },
    ]);
  });
});

describe('getHomebaseLocations', () => {
  it('returns an empty list when reference-data has not synced it yet', async () => {
    const { service } = setup();

    expect(await service.getHomebaseLocations()).toEqual([]);
  });

  it('reads the synced homebaselocations and drops broken rows', async () => {
    const { service, referenceDataService } = setup(
      {},
      {
        getEntity: vi.fn(async () => [
          { dn_companylocationid: 'loc-1', dn_name: 'Utrecht', dn_city: 'Utrecht' },
          { dn_name: 'broken, no id' },
        ]),
      },
    );

    const locations = await service.getHomebaseLocations();

    expect(locations.map((location) => location.id)).toEqual(['loc-1']);
    expect(referenceDataService.getEntity).toHaveBeenCalledWith('homebaselocations');
  });
});
