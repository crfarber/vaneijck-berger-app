import { describe, expect, it, vi } from 'vitest';
import type { CurrentLocation } from '@/domeinen/location';
import type { SyncResult } from '@/domeinen/reference-data';
import { SERVICE_STATUS } from '@/domeinen/services';
import { HttpError } from '@/shared/api/errors';
import { createLogger } from '@/shared/logging/logger';
import { createFakeClock } from '@/test/fakes';
import type { ServiceFormApi } from '../api/service-form-api';
import { createServiceFormService, logServiceFormSubmitFailure } from './service-form-service';

describe('submission diagnostics', () => {
  it('identifies the failed step and HTTP response without logging server content', () => {
    const logger = createLogger({ clock: createFakeClock() });
    const error = new HttpError(
      400,
      {
        title: 'Private server content',
        detail: 'Private response data',
        traceId: 'test-trace-id',
      },
      'Private raw body',
    );

    logServiceFormSubmitFailure(logger, 'service-update', error);

    expect(logger.entries()).toEqual([
      expect.objectContaining({
        level: 'error',
        category: 'serviceForm',
        data: {
          stage: 'service-update',
          errorType: 'HttpError',
          retryable: false,
          status: 400,
          traceId: 'test-trace-id',
        },
      }),
    ]);
    expect(JSON.stringify(logger.entries())).not.toContain('Private');
  });

  it('identifies local failures without logging their potentially sensitive message', () => {
    const logger = createLogger({ clock: createFakeClock() });

    logServiceFormSubmitFailure(logger, 'signature-validation', new Error('Private image data'));
    logServiceFormSubmitFailure(logger, 'draft-clear', null);

    expect(logger.entries().map((entry) => entry.data)).toEqual([
      { stage: 'signature-validation', errorType: 'Error', retryable: false },
      { stage: 'draft-clear', errorType: 'UnknownError', retryable: false },
    ]);
    expect(JSON.stringify(logger.entries())).not.toContain('Private');
  });
});

const definition = (servicecode: number) => ({
  servicecode,
  servicename: [{ 'language-code': 1043, value: `Dienst ${servicecode}` }],
  definition: [],
});

function setup(
  entities: Record<string, unknown[]>,
  location: CurrentLocation = { isValid: false },
  bundledDefinitions?: readonly unknown[],
  bundledDefinitionLoader?: () => Promise<readonly unknown[]>,
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
  const locationReader = {
    getCurrent: vi.fn(async () => location),
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
  };
  const logger = createLogger({ clock: createFakeClock() });
  const service = createServiceFormService({
    api,
    referenceData,
    locationReader,
    logger,
    ...(bundledDefinitions === undefined ? {} : { bundledDefinitions }),
    ...(bundledDefinitionLoader === undefined ? {} : { bundledDefinitionLoader }),
  });
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

  it('reads a bundled catalog instead of synced reference data', async () => {
    const bundled = definition(1004);
    const { service, referenceData, logger } = setup(
      { dn_definitions: [{ dataDefinition: [definition(1003)] }] },
      { isValid: false },
      [bundled],
    );

    expect(await service.findDefinition(1004)).toEqual(bundled);
    expect(await service.findDefinition(1003)).toBeNull();
    expect(referenceData.listEntities).not.toHaveBeenCalled();
    expect(referenceData.getEntity).not.toHaveBeenCalled();
    expect(logger.entries().map((entry) => entry.message)).toEqual([
      'Form definitions come from the bundled catalog, not synced reference data',
      'No bundled form definition for this service type',
    ]);
  });

  it('retries a bundled catalog without resetting or syncing reference data', async () => {
    const { service, referenceData } = setup({}, { isValid: false }, [definition(1004)]);

    expect(await service.refreshDefinition(1004)).toEqual(definition(1004));
    expect(referenceData.reset).not.toHaveBeenCalled();
    expect(referenceData.sync).not.toHaveBeenCalled();
    expect(referenceData.listEntities).not.toHaveBeenCalled();
  });

  it('reloads a bundled catalog from the dev server without touching reference data', async () => {
    const updated = {
      ...definition(1004),
      servicename: [{ 'language-code': 1043, value: 'Nieuw' }],
    };
    const loader = vi.fn(async () => [updated]);
    const { service, referenceData } = setup(
      { dn_definitions: [{ dataDefinition: [definition(1003)] }] },
      { isValid: false },
      [definition(1004)],
      loader,
    );

    expect(await service.reloadBundledDefinition(1004)).toEqual(updated);
    expect(await service.findDefinition(1004)).toEqual(updated);
    expect(loader).toHaveBeenCalledOnce();
    expect(referenceData.listEntities).not.toHaveBeenCalled();
    expect(referenceData.getEntity).not.toHaveBeenCalled();
    expect(referenceData.reset).not.toHaveBeenCalled();
    expect(referenceData.sync).not.toHaveBeenCalled();
  });

  it('keeps the previous bundled catalog when a reload fails', async () => {
    const loader = vi.fn(async () => {
      throw new Error('dev server down');
    });
    const { service, logger } = setup({}, { isValid: false }, [definition(1004)], loader);

    await expect(service.reloadBundledDefinition(1004)).rejects.toThrow('dev server down');
    expect(await service.findDefinition(1004)).toEqual(definition(1004));
    expect(logger.entries()[0]).toEqual(
      expect.objectContaining({
        level: 'warn',
        category: 'serviceForm',
        data: { errorType: 'Error' },
      }),
    );
    expect(JSON.stringify(logger.entries())).not.toContain('dev server down');
  });

  it('still loads select tables from synced reference data when definitions are bundled', async () => {
    const { service, getEntity } = setup(
      { dn_truefalse: [{ Text: 'Ja', Value: true }] },
      { isValid: false },
      [definition(1004)],
    );

    expect(await service.loadTable('dn_truefalse')).toEqual([{ Text: 'Ja', Value: true }]);
    expect(getEntity.mock.calls.map(([name]) => name)).toEqual(['dn_truefalse']);
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
    const { service, locationReader } = setup(
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
    expect(locationReader.getCurrent).toHaveBeenCalledWith({ accuracy: 'coarse' });
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

  it('logs a failed submit without logging the form body and lets the screen offer a retry', async () => {
    const { service, api, logger } = setup({});
    vi.mocked(api.updateService).mockRejectedValueOnce(new HttpError(503, null));

    await expect(
      service.submit({
        serviceId: 'svc-1',
        statuscode: SERVICE_STATUS.IN_UITVOERING,
        body: { dn_remarks: 'private form value' },
      }),
    ).rejects.toThrow('HTTP 503');

    expect(logger.entries()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'serviceForm',
          level: 'info',
          message: 'Submitting service form',
        }),
        expect.objectContaining({
          category: 'serviceForm',
          level: 'error',
          message: 'Service form submission failed',
          data: { errorType: 'HttpError', status: 503 },
        }),
      ]),
    );
    expect(JSON.stringify(logger.entries())).not.toContain('private form value');
  });
});
