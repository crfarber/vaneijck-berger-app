import { describe, expect, it, vi } from 'vitest';
import type { ReferenceDataService } from '@/domeinen/reference-data';
import { WORKER_AVAILABILITY } from '../domain/availability';
import type { WorkerApi } from '../api/worker-api';
import { createWorkerAvailabilityService } from './worker-availability-service';

function setup(rows: unknown[] | null) {
  const api = {
    get: vi.fn(),
    setAvailability: vi.fn(async () => undefined),
  } satisfies WorkerApi;
  const referenceDataService = {
    getEntity: vi.fn(async () => rows),
  } as unknown as ReferenceDataService;
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const service = createWorkerAvailabilityService({
    api,
    referenceDataService,
    logger: logger as never,
  });
  return { service, api, referenceDataService, logger };
}

describe('listOptions', () => {
  it('parses Value/Text rows without filtering', async () => {
    const { service, referenceDataService } = setup([
      { Value: WORKER_AVAILABILITY.AVAILABLE, Text: 'Beschikbaar' },
      { Value: WORKER_AVAILABILITY.BUSY, Text: 'Bezig' },
    ]);

    expect(await service.listOptions()).toEqual([
      { value: WORKER_AVAILABILITY.AVAILABLE, text: 'Beschikbaar' },
      { value: WORKER_AVAILABILITY.BUSY, text: 'Bezig' },
    ]);
    expect(referenceDataService.getEntity).toHaveBeenCalledWith('dn_availabilitystatuscode');
  });

  it('returns an empty list when the entity was never synced', async () => {
    const { service } = setup(null);
    expect(await service.listOptions()).toEqual([]);
  });

  it('skips unusable rows and logs how many failed', async () => {
    const { service, logger } = setup([
      { Value: WORKER_AVAILABILITY.AVAILABLE, Text: 'Beschikbaar' },
      { not: 'a status' },
    ]);

    expect(await service.listOptions()).toEqual([
      { value: WORKER_AVAILABILITY.AVAILABLE, text: 'Beschikbaar' },
    ]);
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('setAvailability', () => {
  it('returns ok when the PUT succeeds', async () => {
    const { service, api } = setup([]);
    expect(await service.setAvailability(WORKER_AVAILABILITY.BREAK)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(api.setAvailability).toHaveBeenCalledWith(WORKER_AVAILABILITY.BREAK);
  });

  it('returns request-failed when the PUT throws', async () => {
    const { service, api } = setup([]);
    api.setAvailability = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await service.setAvailability(WORKER_AVAILABILITY.BREAK)).toEqual({
      ok: false,
      error: 'request-failed',
    });
  });
});
