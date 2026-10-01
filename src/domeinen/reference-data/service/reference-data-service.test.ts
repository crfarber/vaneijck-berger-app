import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '@/shared/logging/logger';
import { createFakeClock, createInMemoryStore } from '@/test/fakes';
import type { ReferenceDataApi } from '../api/reference-data-api';
import { createReferenceDataService } from './reference-data-service';

const NOW = Date.UTC(2026, 8, 22, 12, 0, 0);

function setup(options: { fetchSchema?: ReferenceDataApi['fetchSchema'] } = {}) {
  const store = createInMemoryStore();
  const clock = createFakeClock(NOW);
  const entities = new Map<string, unknown[]>();
  const fetchEntity = vi.fn(async (name: string) => {
    const data = entities.get(name);
    if (data === undefined) {
      throw new Error(`No fake data for ${name}`);
    }
    return data;
  });
  const api: ReferenceDataApi = {
    fetchSchema: options.fetchSchema ?? vi.fn(async () => []),
    fetchEntity,
  };
  const service = createReferenceDataService({
    api,
    store,
    clock,
    languageCode: 1043,
    logger: createLogger({ clock }),
  });
  return { service, store, clock, api, entities, fetchEntity };
}

describe('sync', () => {
  it('publishes progress and the failed entities for a settings status screen', async () => {
    const fetchSchema = vi.fn(async () => ['dn_synced', 'dn_failed']);
    const { service, entities } = setup({ fetchSchema });
    entities.set('dn_synced', [{ id: 1 }]);
    const statuses: string[] = [];
    const stop = service.subscribeToSyncStatus((status) => statuses.push(status.phase));

    await service.sync();

    expect(statuses[0]).toBe('syncing');
    expect(statuses.at(-1)).toBe('failed');
    expect(service.getSyncStatus()).toEqual({
      phase: 'failed',
      synced: ['dn_synced'],
      failed: ['dn_failed'],
      topics: [
        { name: 'dn_synced', phase: 'succeeded' },
        { name: 'dn_failed', phase: 'failed' },
      ],
    });
    stop();
  });

  it('on the first run, asks for every entity and fetches each one', async () => {
    const fetchSchema = vi.fn(async () => ['dn_servicetype', 'dn_optionset']);
    const { service, entities, store } = setup({ fetchSchema });
    entities.set('dn_servicetype', [{ id: 1 }]);
    entities.set('dn_optionset', [{ id: 2 }]);

    const result = await service.sync();

    expect(fetchSchema).toHaveBeenCalledWith(1043, undefined);
    expect(result).toEqual({ synced: ['dn_servicetype', 'dn_optionset'], failed: [] });
    expect(await service.getEntity('dn_servicetype')).toEqual([{ id: 1 }]);
    expect(await service.getEntity('dn_optionset')).toEqual([{ id: 2 }]);
    expect(await store.getItem('referenceData.since')).toBe(new Date(NOW).toISOString());
    expect(await store.getItem('referenceData.pending')).toBeNull();
  });

  it('on a later run, sends the committed since date and only touches the returned entities', async () => {
    const { service, store, api } = setup();
    await store.setItem('referenceData.since', '2026-09-01T00:00:00.000Z');
    await store.setItem('referenceData.entities', JSON.stringify(['dn_servicetype']));
    await store.setItem('referenceData.entity.dn_servicetype', JSON.stringify([{ id: 'old' }]));
    vi.mocked(api.fetchSchema).mockResolvedValueOnce(['dn_optionset']);
    vi.mocked(api.fetchEntity).mockResolvedValueOnce([{ id: 'new' }]);

    const result = await service.sync();

    expect(api.fetchSchema).toHaveBeenCalledWith(1043, '2026-09-01T00:00:00.000Z');
    expect(result).toEqual({ synced: ['dn_optionset'], failed: [] });
    // Untouched: the endpoint did not report dn_servicetype as changed.
    expect(await service.getEntity('dn_servicetype')).toEqual([{ id: 'old' }]);
    expect(await store.getItem('referenceData.since')).toBe(new Date(NOW).toISOString());
  });

  it('does nothing when nothing changed, and leaves the since date as it was', async () => {
    const { service, store, api } = setup();
    await store.setItem('referenceData.since', '2026-09-01T00:00:00.000Z');
    await store.setItem('referenceData.entities', JSON.stringify([]));
    vi.mocked(api.fetchSchema).mockResolvedValueOnce([]);

    const result = await service.sync();

    expect(result).toEqual({ synced: [], failed: [] });
    expect(await store.getItem('referenceData.since')).toBe('2026-09-01T00:00:00.000Z');
    expect(await store.getItem('referenceData.pending')).toBeNull();
  });

  it('keeps a failed entity queued and does not commit the since date', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a', 'dn_b']);
    const { service, entities, store } = setup({ fetchSchema });
    entities.set('dn_a', [{ id: 1 }]);
    // dn_b has no fake data, so fetchEntity throws for it.

    const result = await service.sync();

    expect(result).toEqual({ synced: ['dn_a'], failed: ['dn_b'] });
    expect(await store.getItem('referenceData.since')).toBeNull();
    const pending = JSON.parse((await store.getItem('referenceData.pending')) ?? 'null');
    expect(pending).toEqual({ since: new Date(NOW).toISOString(), entities: ['dn_b'] });
  });

  it('resumes an interrupted batch without asking the server again', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a', 'dn_b']);
    const { service, entities, fetchEntity } = setup({ fetchSchema });
    entities.set('dn_a', [{ id: 1 }]);
    await service.sync(); // dn_b fails, stays pending
    fetchSchema.mockClear();
    entities.set('dn_b', [{ id: 2 }]); // now the network/data problem is gone

    const result = await service.sync();

    expect(fetchSchema).not.toHaveBeenCalled();
    expect(fetchEntity).toHaveBeenLastCalledWith('dn_b', 1043);
    expect(result).toEqual({ synced: ['dn_b'], failed: [] });
    expect(await service.getEntity('dn_a')).toEqual([{ id: 1 }]);
    expect(await service.getEntity('dn_b')).toEqual([{ id: 2 }]);
  });

  it('commits the since date once the batch completes across several calls', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a', 'dn_b']);
    const { service, entities, store } = setup({ fetchSchema });
    entities.set('dn_a', [{ id: 1 }]);
    await service.sync(); // dn_b still fails
    expect(await store.getItem('referenceData.since')).toBeNull();

    entities.set('dn_b', [{ id: 2 }]);
    await service.sync();

    expect(await store.getItem('referenceData.since')).toBe(new Date(NOW).toISOString());
    expect(await store.getItem('referenceData.pending')).toBeNull();
  });

  it('never commits while every retry keeps failing', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a']);
    const { service, store } = setup({ fetchSchema });

    await service.sync();
    await service.sync();
    await service.sync();

    expect(fetchSchema).toHaveBeenCalledTimes(1); // the other two calls resumed, not re-asked
    expect(await store.getItem('referenceData.since')).toBeNull();
  });

  it("does not overwrite a failed entity's last known value", async () => {
    const { service, store, api } = setup();
    await store.setItem('referenceData.entity.dn_a', JSON.stringify([{ id: 'kept' }]));
    vi.mocked(api.fetchSchema).mockResolvedValueOnce(['dn_a']);
    vi.mocked(api.fetchEntity).mockRejectedValueOnce(new Error('boom'));

    await service.sync();

    expect(await service.getEntity('dn_a')).toEqual([{ id: 'kept' }]);
  });
});

describe('getEntity', () => {
  it('is null when the entity has never synced', async () => {
    const { service } = setup();

    expect(await service.getEntity('dn_never_synced')).toBeNull();
  });
});

describe('listEntities', () => {
  it('is empty before anything synced', async () => {
    const { service } = setup();

    expect(await service.listEntities()).toEqual([]);
  });

  it('lists every entity that synced, once, across several batches', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a', 'dn_b']);
    const { service, entities, api } = setup({ fetchSchema });
    entities.set('dn_a', [{ id: 1 }]);
    entities.set('dn_b', [{ id: 2 }]);
    await service.sync();
    vi.mocked(api.fetchSchema).mockResolvedValueOnce(['dn_b', 'dn_c']);
    entities.set('dn_c', [{ id: 3 }]);

    await service.sync();

    expect(await service.listEntities()).toEqual(['dn_a', 'dn_b', 'dn_c']);
  });

  it('leaves out an entity whose fetch failed and that never synced before', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a', 'dn_broken']);
    const { service, entities } = setup({ fetchSchema });
    entities.set('dn_a', [{ id: 1 }]);

    await service.sync();

    expect(await service.listEntities()).toEqual(['dn_a']);
  });

  it('keeps the list after a reset, because the entity data stays too', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a']);
    const { service, entities } = setup({ fetchSchema });
    entities.set('dn_a', [{ id: 1 }]);
    await service.sync();

    await service.reset();

    expect(await service.listEntities()).toEqual(['dn_a']);
  });

  it('treats a damaged list as empty', async () => {
    const { service, store } = setup();
    await store.setItem('referenceData.entities', '{not json');

    expect(await service.listEntities()).toEqual([]);
  });

  it('asks for everything once when a since date exists from before the list was kept', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a']);
    const { service, entities, store } = setup({ fetchSchema });
    await store.setItem('referenceData.since', '2026-09-01T00:00:00.000Z');
    entities.set('dn_a', [{ id: 1 }]);

    await service.sync();

    expect(fetchSchema).toHaveBeenCalledWith(1043, undefined);
    expect(await service.listEntities()).toEqual(['dn_a']);
  });
});

describe('refreshEntity', () => {
  it('fetches only that entity and leaves the since date alone', async () => {
    const { service, store, api, entities } = setup();
    await store.setItem('referenceData.since', '2026-09-01T00:00:00.000Z');
    await store.setItem('referenceData.entities', JSON.stringify(['dn_collegues']));
    await store.setItem('referenceData.entity.dn_collegues', JSON.stringify([{ id: 'old' }]));
    entities.set('dn_collegues', [{ id: 'new' }]);

    await service.refreshEntity('dn_collegues');

    expect(api.fetchSchema).not.toHaveBeenCalled();
    expect(api.fetchEntity).toHaveBeenCalledWith('dn_collegues', 1043);
    expect(await service.getEntity('dn_collegues')).toEqual([{ id: 'new' }]);
    expect(await store.getItem('referenceData.since')).toBe('2026-09-01T00:00:00.000Z');
    expect(service.getSyncStatus().topics).toContainEqual({
      name: 'dn_collegues',
      phase: 'succeeded',
    });
  });

  it('keeps the previous value and marks the topic failed when the fetch fails', async () => {
    const { service, store, api } = setup();
    await store.setItem('referenceData.entity.dn_collegues', JSON.stringify([{ id: 'kept' }]));
    vi.mocked(api.fetchEntity).mockRejectedValueOnce(new Error('boom'));

    await expect(service.refreshEntity('dn_collegues')).rejects.toThrow('boom');

    expect(await service.getEntity('dn_collegues')).toEqual([{ id: 'kept' }]);
    expect(service.getSyncStatus()).toMatchObject({
      phase: 'failed',
      failed: ['dn_collegues'],
      topics: [{ name: 'dn_collegues', phase: 'failed' }],
    });
  });
});

describe('abortPending', () => {
  it('drops an unfinished batch but keeps the since date for the next incremental sync', async () => {
    const { service, store, api } = setup();
    await store.setItem('referenceData.since', '2026-09-01T00:00:00.000Z');
    await store.setItem('referenceData.entities', JSON.stringify(['dn_a']));
    await store.setItem('referenceData.entity.dn_a', JSON.stringify([{ id: 1 }]));
    await store.setItem(
      'referenceData.pending',
      JSON.stringify({ since: new Date(NOW).toISOString(), entities: ['dn_b'] }),
    );

    await service.abortPending();

    expect(await store.getItem('referenceData.since')).toBe('2026-09-01T00:00:00.000Z');
    expect(await store.getItem('referenceData.pending')).toBeNull();
    expect(await service.getEntity('dn_a')).toEqual([{ id: 1 }]);

    vi.mocked(api.fetchSchema).mockResolvedValueOnce([]);
    await service.sync();
    expect(api.fetchSchema).toHaveBeenLastCalledWith(1043, '2026-09-01T00:00:00.000Z');
  });
});

describe('reset', () => {
  it('forgets the since date and any pending batch, so the next sync asks for everything', async () => {
    const fetchSchema = vi.fn(async () => ['dn_a']);
    const { service, entities, store } = setup({ fetchSchema });
    entities.set('dn_a', [{ id: 1 }]);
    await service.sync();
    expect(await store.getItem('referenceData.since')).not.toBeNull();

    await service.reset();

    expect(await store.getItem('referenceData.since')).toBeNull();
    expect(await store.getItem('referenceData.pending')).toBeNull();
    await service.sync();
    expect(fetchSchema).toHaveBeenLastCalledWith(1043, undefined);
  });

  it("keeps an entity's last synced value: it is harmless data, not a secret", async () => {
    const fetchSchema = vi.fn(async () => ['dn_a']);
    const { service, entities } = setup({ fetchSchema });
    entities.set('dn_a', [{ id: 1 }]);
    await service.sync();

    await service.reset();

    expect(await service.getEntity('dn_a')).toEqual([{ id: 1 }]);
  });
});
