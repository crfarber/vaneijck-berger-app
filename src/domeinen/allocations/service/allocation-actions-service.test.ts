import { describe, expect, it, vi } from 'vitest';
import { NetworkError } from '@/shared/api/errors';
import type { AllocationUnitService, ReregisterOutcome } from '@/domeinen/allocation-unit';
import type { ReferenceDataService } from '@/domeinen/reference-data';
import type { AllocationsApi } from '../api/allocations-api';
import { ALLOCATION_ACCEPT_STATUS, ALLOCATION_DONE_STATUS } from '../domain/status';
import { createAllocationActionsService } from './allocation-actions-service';

function setup(
  apiOverrides: Partial<AllocationsApi> = {},
  unitOverrides: Partial<AllocationUnitService> = {},
  referenceDataOverrides: Partial<ReferenceDataService> = {},
  onFinished?: (allocationId: string) => Promise<void>,
) {
  const api: AllocationsApi = {
    list: vi.fn(async () => []),
    get: vi.fn(),
    getServicesByIncidentId: vi.fn(),
    getService: vi.fn(),
    accept: vi.fn(async () => undefined),
    decline: vi.fn(async () => undefined),
    acceptService: vi.fn(async () => undefined),
    declineService: vi.fn(async () => undefined),
    listVehicleReleases: vi.fn(async () => []),
    reassign: vi.fn(async () => undefined),
    checkZipcode: vi.fn(async () => ''),
    ...apiOverrides,
  };
  const allocationUnitService: AllocationUnitService = {
    getCurrent: vi.fn(async () => null),
    registerExternal: vi.fn(),
    registerInternal: vi.fn(),
    extendShift: vi.fn(),
    cancelCurrentUnit: vi.fn(async () => ({ ok: true as const, value: undefined })),
    checkReregister: vi.fn(async (): Promise<ReregisterOutcome> => ({ kind: 'not-needed' })),
    getFleet: vi.fn(async () => []),
    getHomebaseLocations: vi.fn(async () => []),
    ...unitOverrides,
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
  const outbox = { enqueue: vi.fn(async () => undefined) };
  const service = createAllocationActionsService({
    api,
    allocationUnitService,
    referenceDataService,
    outbox,
    onFinished,
  });
  return { service, api, allocationUnitService, referenceDataService, outbox };
}

describe('accept', () => {
  it('accepts with the fixed status once the unit checks out', async () => {
    const { service, api, allocationUnitService } = setup();

    const result = await service.accept('alloc-1', false);

    expect(result).toEqual({ kind: 'accepted' });
    expect(allocationUnitService.checkReregister).toHaveBeenCalledWith(false);
    expect(api.accept).toHaveBeenCalledWith('alloc-1', ALLOCATION_ACCEPT_STATUS);
  });

  it('does not accept when the unit needs (re-)registering', async () => {
    const { service, api } = setup(
      {},
      {
        checkReregister: vi.fn(async (): Promise<ReregisterOutcome> => ({
          kind: 'required',
          reason: 'no-unit',
        })),
      },
    );

    const result = await service.accept('alloc-1', false);

    expect(result).toEqual({ kind: 'reregister-required' });
    expect(api.accept).not.toHaveBeenCalled();
  });

  it('reports blocked when there is active work and no usable unit', async () => {
    const { service, api } = setup(
      {},
      {
        checkReregister: vi.fn(async (): Promise<ReregisterOutcome> => ({
          kind: 'blocked',
          reason: 'no-unit',
        })),
      },
    );

    const result = await service.accept('alloc-1', true);

    expect(result).toEqual({ kind: 'blocked' });
    expect(api.accept).not.toHaveBeenCalled();
  });

  it('reports a failure without throwing', async () => {
    const { service } = setup({
      accept: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    expect(await service.accept('alloc-1', false)).toEqual({ kind: 'failed' });
  });
});

describe('decline', () => {
  it('declines with the chosen reason', async () => {
    const { service, api } = setup();

    const result = await service.decline('alloc-1', 875920006);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(api.decline).toHaveBeenCalledWith('alloc-1', 875920006);
  });

  it('reports a failure without throwing', async () => {
    const { service } = setup({
      decline: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    expect(await service.decline('alloc-1', 1)).toEqual({ ok: false, error: 'request-failed' });
  });
});

describe('finish', () => {
  it('declines with the fixed "done" status', async () => {
    const { service, api } = setup();

    await service.finish('alloc-1');

    expect(api.decline).toHaveBeenCalledWith('alloc-1', ALLOCATION_DONE_STATUS);
  });

  it('queues a finish that never reached the server', async () => {
    const onFinished = vi.fn(async () => undefined);
    const { service, outbox } = setup(
      {
        decline: vi.fn(async () => {
          throw new NetworkError();
        }),
      },
      {},
      {},
      onFinished,
    );

    expect(await service.finish('alloc-1')).toEqual({ ok: false, error: 'queued' });
    expect(outbox.enqueue).toHaveBeenCalledWith({
      kind: 'finish-allocation',
      allocationId: 'alloc-1',
    });
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('cleans up only after the server confirms the finish', async () => {
    const onFinished = vi.fn(async () => undefined);
    const { service, api } = setup({}, {}, {}, onFinished);
    expect(await service.finish('alloc-1')).toEqual({ ok: true, value: undefined });
    expect(api.decline).toHaveBeenCalledWith('alloc-1', ALLOCATION_DONE_STATUS);
    expect(onFinished).toHaveBeenCalledWith('alloc-1');
  });
});

describe('getDeclineReasons', () => {
  it('returns nothing when reference-data has not synced it yet', async () => {
    const { service } = setup({}, {}, { getEntity: vi.fn(async () => null) });
    expect(await service.getDeclineReasons(true)).toEqual([]);
  });

  it('parses and filters the synced rows', async () => {
    const { service, referenceDataService } = setup(
      {},
      {},
      {
        getEntity: vi.fn(async () => [
          { Value: 875920000, Text: 'Aanrijdend' }, // filtered: in-progress state, not a reason
          { Value: 875920006, Text: 'Medewerker niet beschikbaar' },
        ]),
      },
    );

    expect(await service.getDeclineReasons(true)).toEqual([
      { value: 875920006, text: 'Medewerker niet beschikbaar' },
    ]);
    expect(referenceDataService.getEntity).toHaveBeenCalledWith('dn_allocation_statuscode');
  });

  it('drops a row that fails to parse instead of failing the whole list', async () => {
    const { service } = setup(
      {},
      {},
      { getEntity: vi.fn(async () => [{ Value: 1 }, { Value: 875920006, Text: 'ok' }]) },
    );

    expect(await service.getDeclineReasons(true)).toEqual([{ value: 875920006, text: 'ok' }]);
  });
});
