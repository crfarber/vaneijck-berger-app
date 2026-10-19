import { describe, expect, it, vi } from 'vitest';
import { NetworkError } from '@/shared/api/errors';
import {
  ACCEPT_LOCATION_MAX_AGE_MS,
  ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
  type CurrentLocation,
  type LocationReader,
} from '@/domeinen/location';
import { SERVICE_STATUS } from '@/domeinen/services';
import type { AllocationsApi } from '../api/allocations-api';
import { createServiceActionsService } from './service-actions-service';

function setup(current: CurrentLocation, apiOverrides: Partial<AllocationsApi> = {}) {
  const api: AllocationsApi = {
    list: vi.fn(async () => []),
    get: vi.fn(),
    getServicesByIncidentId: vi.fn(),
    getService: vi.fn(),
    accept: vi.fn(),
    decline: vi.fn(),
    acceptService: vi.fn(async () => undefined),
    declineService: vi.fn(async () => undefined),
    listVehicleReleases: vi.fn(async () => []),
    reassign: vi.fn(async () => undefined),
    checkZipcode: vi.fn(async () => ''),
    ...apiOverrides,
  };
  const locationReader: LocationReader = {
    getCurrent: vi.fn(async () => current),
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
  };
  const outbox = { enqueue: vi.fn(async () => undefined) };
  const service = createServiceActionsService({ api, locationReader, outbox });
  return { service, api, locationReader, outbox };
}

const NEARBY_INCIDENT = { dn_latitude: 52.0, dn_longtitude: 5.0 };
const HERE = { isValid: true, latitude: 52.0, longitude: 5.0 };
const FAR_AWAY = { isValid: true, latitude: 10.0, longitude: 10.0 };

describe('checkAcceptProximity', () => {
  it('asks the location reader for a fresh sample accurate enough for 500 m', async () => {
    const { service, locationReader } = setup(HERE);

    await service.checkAcceptProximity({
      incident: NEARBY_INCIDENT,
      service: {},
    });

    expect(locationReader.getCurrent).toHaveBeenCalledWith({
      maxAgeMs: ACCEPT_LOCATION_MAX_AGE_MS,
      requiredAccuracyMeters: ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
    });
  });

  it('proceeds when the berger is close to the target', async () => {
    const { service } = setup(HERE);

    const decision = await service.checkAcceptProximity({
      incident: NEARBY_INCIDENT,
      service: {},
    });

    expect(decision).toEqual({ action: 'proceed' });
  });

  it('asks for confirmation when the position is unknown', async () => {
    const { service } = setup({ isValid: false });

    const decision = await service.checkAcceptProximity({
      incident: NEARBY_INCIDENT,
      service: {},
    });

    expect(decision).toEqual({ action: 'confirm', reason: 'no-current-location' });
  });

  it('asks for confirmation when the target is too far away', async () => {
    const { service } = setup(FAR_AWAY);

    const decision = await service.checkAcceptProximity({
      incident: NEARBY_INCIDENT,
      service: {},
    });

    expect(decision).toMatchObject({ action: 'confirm', reason: 'too-far' });
  });
});

describe('acceptService', () => {
  it('accepts with the service (not allocation) status code', async () => {
    const { service, api } = setup(HERE);

    const result = await service.acceptService('svc-1');

    expect(result).toEqual({ ok: true, value: undefined });
    expect(api.acceptService).toHaveBeenCalledWith('svc-1', SERVICE_STATUS.IN_UITVOERING);
  });

  it('reports a failure without throwing', async () => {
    const { service } = setup(HERE, {
      acceptService: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    expect(await service.acceptService('svc-1')).toEqual({ ok: false, error: 'request-failed' });
  });

  it('queues an accept that never reached the server', async () => {
    const { service, outbox } = setup(HERE, {
      acceptService: vi.fn(async () => {
        throw new NetworkError();
      }),
    });

    expect(await service.acceptService('svc-1')).toEqual({ ok: false, error: 'queued' });
    expect(outbox.enqueue).toHaveBeenCalledWith({ kind: 'accept-service', serviceId: 'svc-1' });
  });
});

describe('declineService', () => {
  it('declines with the given status code', async () => {
    const { service, api } = setup(HERE);

    const result = await service.declineService('svc-1', SERVICE_STATUS.VERGEEFSE_RIT);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(api.declineService).toHaveBeenCalledWith('svc-1', SERVICE_STATUS.VERGEEFSE_RIT);
  });

  it('queues a decline that never reached the server', async () => {
    const { service, outbox } = setup(HERE, {
      declineService: vi.fn(async () => {
        throw new NetworkError();
      }),
    });

    expect(await service.declineService('svc-1', SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP)).toEqual({
      ok: false,
      error: 'queued',
    });
    expect(outbox.enqueue).toHaveBeenCalledWith({
      kind: 'decline-service',
      serviceId: 'svc-1',
      statuscode: SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP,
    });
  });
});
