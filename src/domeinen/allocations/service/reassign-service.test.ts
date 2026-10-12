import { describe, expect, it, vi } from 'vitest';
import type { ReferenceDataService } from '@/domeinen/reference-data';
import type { AllocationsApi } from '../api/allocations-api';
import { createReassignService } from './reassign-service';

function setup(
  apiOverrides: Partial<AllocationsApi> = {},
  referenceDataOverrides: Partial<ReferenceDataService> = {},
) {
  const api: AllocationsApi = {
    list: vi.fn(async () => []),
    get: vi.fn(),
    getServicesByIncidentId: vi.fn(),
    getService: vi.fn(),
    accept: vi.fn(),
    decline: vi.fn(),
    acceptService: vi.fn(),
    declineService: vi.fn(),
    listVehicleReleases: vi.fn(async () => []),
    reassign: vi.fn(async () => undefined),
    checkZipcode: vi.fn(async () => ''),
    ...apiOverrides,
  };
  const referenceDataService: ReferenceDataService = {
    sync: vi.fn(async () => ({ synced: [], failed: [] })),
    getSyncStatus: vi.fn(() => ({ phase: 'idle' as const, synced: [], failed: [], topics: [] })),
    subscribeToSyncStatus: vi.fn(() => () => undefined),
    getEntity: vi.fn(async () => null),
    replaceEntityData: vi.fn(async () => undefined),
    getEntityMeta: vi.fn(async () => null),
    listEntities: vi.fn(async () => []),
    refreshEntity: vi.fn(async () => undefined),
    abortPending: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
    clearAll: vi.fn(async () => undefined),
    ...referenceDataOverrides,
  };
  const service = createReassignService({ api, referenceDataService });
  return { service, api, referenceDataService };
}

describe('listColleagues', () => {
  it('parses the dn_collegues reference-data entity', async () => {
    const { service } = setup(
      {},
      {
        getEntity: vi.fn(async () => [{ dn_workerid: 'w1', dn_name: 'Jan' }]),
      },
    );

    expect(await service.listColleagues()).toEqual([{ id: 'w1', workerId: 'w1', name: 'Jan' }]);
  });

  it('returns nothing when the entity has never synced', async () => {
    const { service } = setup({}, { getEntity: vi.fn(async () => null) });
    expect(await service.listColleagues()).toEqual([]);
  });

  it('drops a broken row and keeps the rest', async () => {
    const { service } = setup(
      {},
      {
        getEntity: vi.fn(async () => [
          { dn_workerid: 'w1', dn_name: 'Jan' },
          { dn_workerid: 'w2' },
        ]),
      },
    );

    expect(await service.listColleagues()).toEqual([{ id: 'w1', workerId: 'w1', name: 'Jan' }]);
  });
});

describe('reassign', () => {
  it('calls the api and reports success', async () => {
    const { service, api } = setup();

    const result = await service.reassign('inc-1', 'worker-2');

    expect(result).toEqual({ ok: true, value: undefined });
    expect(api.reassign).toHaveBeenCalledWith('inc-1', 'worker-2');
  });

  it('reports failure without throwing when the request fails', async () => {
    const { service } = setup({
      reassign: vi.fn(async () => {
        throw new Error('network error');
      }),
    });

    const result = await service.reassign('inc-1', 'worker-2');

    expect(result).toEqual({ ok: false, error: 'request-failed' });
  });
});
