import { describe, expect, it, vi } from 'vitest';
import type { CurrentLocation } from '@/domeinen/location';
import type { SyncResult } from '@/domeinen/reference-data';
import { SERVICE_STATUS } from '@/domeinen/services';
import { createLogger } from '@/shared/logging/logger';
import { createFakeClock } from '@/test/fakes';
import type { ServiceFormApi } from '../api/service-form-api';
import { createServiceFormService } from './service-form-service';

const definition = (servicecode: number) => ({
  servicecode,
  servicename: [{ 'language-code': 1043, value: `Dienst ${servicecode}` }],
  definition: [],
});

function setup(
  entities: Record<string, unknown[]>,
  location: CurrentLocation = { isValid: false },
) {
  const stored = { ...entities };
  const getEntity = vi.fn(async (name: string) => stored[name] ?? null);
  const referenceData = {
    getEntity,
    listEntities: vi.fn(async () => Object.keys(stored)),
    refreshEntity: vi.fn(async () => undefined),
    abortPending: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
    sync: vi.fn<() => Promise<SyncResult>>(async () => ({ synced: [], failed: [] })),
  };
  const api: ServiceFormApi = { updateService: vi.fn(async () => undefined) };
  const locationReader = { getCurrent: vi.fn(async () => location) };
  const logger = createLogger({ clock: createFakeClock() });
  const service = createServiceFormService({ api, referenceData, locationReader, logger });
  return { service, stored, getEntity, referenceData, api, locationReader, logger };
}

describe('findDefinition', () => {
  it('finds the definition in whichever synced entity holds it, like the old storage scan', async () => {
    const { service } = setup({
      dn_country: [{ dn_name: 'Nederland', dn_countryid: 'nl' }],
      dn_servicedefinition_1003: [{ dataDefinition: [definition(1003)] }],
    });

    expect(await service.findDefinition(1003)).toEqual(definition(1003));
  });

  it('reads the remembered entity only on the next open, and picks up a new sync of it', async () => {
    const { service, stored, getEntity } = setup({
      dn_country: [{ dn_name: 'Nederland', dn_countryid: 'nl' }],
      dn_definitions: [{ dataDefinition: [definition(1003), definition(1012)] }],
    });
    await service.findDefinition(1003);
    getEntity.mockClear();

    const updated = {
      ...definition(1012),
      servicename: [{ 'language-code': 1043, value: 'Nieuw' }],
    };
    stored.dn_definitions = [{ dataDefinition: [definition(1003), updated] }];

    expect(await service.findDefinition(1012)).toEqual(updated);
    expect(getEntity.mock.calls.map(([name]) => name)).toEqual(['dn_definitions']);
  });

  it('searches again when the remembered entity no longer holds the service type', async () => {
    const { service, stored } = setup({
      dn_old: [{ dataDefinition: [definition(1003)] }],
    });
    await service.findDefinition(1003);

    stored.dn_old = [];
    stored.dn_new = [{ dataDefinition: [definition(1003)] }];

    expect(await service.findDefinition(1003)).toEqual(definition(1003));
  });

  it('returns null and logs when no synced entity has the service type', async () => {
    const { service, logger } = setup({
      dn_definitions: [{ dataDefinition: [definition(1003), { definition: [] }] }],
    });

    expect(await service.findDefinition(9999)).toBeNull();
    expect(logger.entries()).toEqual([
      expect.objectContaining({
        level: 'warn',
        category: 'serviceForm',
        data: { serviceCode: 9999 },
      }),
    ]);
  });

  it('synchronizes reference data before retrying a missing definition', async () => {
    const { service, stored, referenceData } = setup({});
    referenceData.sync.mockImplementationOnce(async () => {
      stored.dn_definitions = [{ dataDefinition: [definition(1004)] }];
      return { synced: ['dn_definitions'], failed: [] };
    });

    expect(await service.refreshDefinition(1004)).toEqual(definition(1004));
    expect(referenceData.reset).toHaveBeenCalledOnce();
    expect(referenceData.sync).toHaveBeenCalledOnce();
    expect(referenceData.reset.mock.invocationCallOrder[0]).toBeLessThan(
      referenceData.sync.mock.invocationCallOrder[0] ?? 0,
    );
  });
});

describe('loadTable', () => {
  it('returns the synced rows, skipping anything that is not a row', async () => {
    const { service } = setup({ dn_truefalse: [{ Text: 'Ja', Value: true }, 'kapot', null, []] });

    expect(await service.loadTable('dn_truefalse')).toEqual([{ Text: 'Ja', Value: true }]);
  });

  it('is empty for a table that never synced', async () => {
    const { service } = setup({});

    expect(await service.loadTable('dn_truefalse')).toEqual([]);
  });
});

describe('loadSelectOptions', () => {
  const depots = [
    { dn_name: 'Ver', dn_locationid: 'l-1', dn_latitude: 53, dn_longitude: 6 },
    { dn_name: 'Dichtbij', dn_locationid: 'l-2', dn_latitude: 52.1, dn_longitude: 5.1 },
  ];
  const byDistance = { orderby: 'distance', direction: 'ascending' };

  it('sorts by distance from the device when the field asks for it', async () => {
    const { service } = setup(
      { dn_location: depots },
      { isValid: true, latitude: 52, longitude: 5 },
    );

    expect(
      await service.loadSelectOptions({ table: 'dn_location', sortOptions: byDistance }),
    ).toEqual({
      kind: 'options',
      options: [
        { label: 'Dichtbij', value: 'l-2' },
        { label: 'Ver', value: 'l-1' },
      ],
    });
  });

  it('keeps the synced order without a position', async () => {
    const { service } = setup({ dn_location: depots });

    const result = await service.loadSelectOptions({
      table: 'dn_location',
      sortOptions: byDistance,
    });

    expect(result.kind === 'options' && result.options.map((o) => o.label)).toEqual([
      'Ver',
      'Dichtbij',
    ]);
  });

  it('does not ask for the position when the field is not sorted by distance', async () => {
    const { service, locationReader } = setup({ dn_location: depots });

    await service.loadSelectOptions({ table: 'dn_location' });

    expect(locationReader.getCurrent).not.toHaveBeenCalled();
  });

  it('passes the chosen brand on to the vehicle types', async () => {
    const { service } = setup({
      dn_vehicletypes: [
        { dn_name: 'Golf', dn_vehicletypeid: 't-1', _dn_vehiclebrandid_value: 'vw' },
        { dn_name: 'Corsa', dn_vehicletypeid: 't-2', _dn_vehiclebrandid_value: 'opel' },
      ],
    });

    expect(
      await service.loadSelectOptions({ table: 'dn_vehicletypes', dependencyValue: 'vw' }),
    ).toEqual({ kind: 'options', options: [{ label: 'Golf', value: 't-1' }] });
  });

  it('is empty for a field without a table', async () => {
    const { service } = setup({});

    expect(await service.loadSelectOptions({})).toEqual({ kind: 'empty' });
  });
});

describe('submit', () => {
  it('puts the body on the service while it still takes a form', async () => {
    const { service, api } = setup({});

    const result = await service.submit({
      serviceId: 'svc-1',
      statuscode: SERVICE_STATUS.IN_UITVOERING,
      body: { statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD },
    });

    expect(result).toEqual({ kind: 'submitted' });
    expect(api.updateService).toHaveBeenCalledWith('svc-1', {
      statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD,
    });
  });

  it('sends nothing once the service has moved past the form', async () => {
    const { service, api } = setup({});

    const result = await service.submit({
      serviceId: 'svc-1',
      statuscode: SERVICE_STATUS.GEFACTUREERD,
      body: {},
    });

    expect(result).toEqual({ kind: 'blocked' });
    expect(api.updateService).not.toHaveBeenCalled();
  });

  it('lets a failed request reach the screen, so it can offer a retry', async () => {
    const { service, api } = setup({});
    vi.mocked(api.updateService).mockRejectedValueOnce(new Error('offline'));

    await expect(
      service.submit({ serviceId: 'svc-1', statuscode: SERVICE_STATUS.IN_UITVOERING, body: {} }),
    ).rejects.toThrow('offline');
  });
});
