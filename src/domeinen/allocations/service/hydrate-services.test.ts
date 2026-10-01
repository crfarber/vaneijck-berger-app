import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/shared/api/errors';
import { createLogger } from '@/shared/logging/logger';
import { createFakeClock } from '@/test/fakes';
import type { Service } from '../domain/types';
import { hydrateServices, type HydrateServicesDeps } from './hydrate-services';

const svc = (id: string, fields: Record<string, unknown> = {}): Service => ({
  dn_serviceid: id,
  statuscode: 875920000,
  statecode: 0,
  dn_servicetypecode: 1004,
  ...fields,
});

function setup(
  overrides: {
    incoming?: Service[];
    details?: Record<string, Service | Error>;
    enrich?: HydrateServicesDeps['enrich'];
  } = {},
) {
  const getServicesByIncidentId = vi.fn(async () => overrides.incoming ?? []);
  const getService = vi.fn(async (id: string) => {
    const detail = overrides.details?.[id];
    if (detail instanceof Error) {
      throw detail;
    }
    if (!detail) {
      throw new Error(`no detail for ${id}`);
    }
    return detail;
  });
  const logger = createLogger({ clock: createFakeClock() });
  const deps: HydrateServicesDeps = {
    api: { getServicesByIncidentId, getService },
    enrich: overrides.enrich,
    logger,
  };
  return { deps, getServicesByIncidentId, getService, logger };
}

describe('hydrateServices', () => {
  it('fetches the services of the incident', async () => {
    const { deps, getServicesByIncidentId } = setup({ incoming: [svc('s1'), svc('s2')] });

    const services = await hydrateServices(deps, { incidentId: 'inc-1' });

    expect(getServicesByIncidentId).toHaveBeenCalledWith('inc-1', { signal: undefined });
    expect(services.map((service) => service.dn_serviceid)).toEqual(['s1', 's2']);
  });

  it('merges with what was known, so empty fields do not erase data', async () => {
    const { deps } = setup({ incoming: [svc('s1', { dn_concatlicenseplate: null })] });

    const services = await hydrateServices(deps, {
      incidentId: 'inc-1',
      existing: [svc('s1', { dn_concatlicenseplate: 'AB-12-CD' })],
    });

    expect(services[0]?.dn_concatlicenseplate).toBe('AB-12-CD');
  });

  it('lets the fetched list decide which services exist', async () => {
    const { deps } = setup({ incoming: [svc('s2')] });

    const services = await hydrateServices(deps, { incidentId: 'inc-1', existing: [svc('s1')] });

    expect(services.map((service) => service.dn_serviceid)).toEqual(['s2']);
  });

  describe('services without a type code', () => {
    it('fetches only those services by id and merges the detail', async () => {
      const { deps, getService } = setup({
        incoming: [svc('s1'), svc('s2', { dn_servicetypecode: undefined })],
        details: { s2: svc('s2', { dn_servicetypecode: 1012, dn_extra: 'from detail' }) },
      });

      const services = await hydrateServices(deps, { incidentId: 'inc-1' });

      expect(getService).toHaveBeenCalledTimes(1);
      expect(getService).toHaveBeenCalledWith('s2', { signal: undefined });
      expect(services[1]).toMatchObject({ dn_servicetypecode: 1012, dn_extra: 'from detail' });
    });

    it('treats a null type code as missing', async () => {
      const { deps, getService } = setup({
        incoming: [svc('s1', { dn_servicetypecode: null })],
        details: { s1: svc('s1', { dn_servicetypecode: 1007 }) },
      });

      const services = await hydrateServices(deps, { incidentId: 'inc-1' });

      expect(getService).toHaveBeenCalledTimes(1);
      expect(services[0]?.dn_servicetypecode).toBe(1007);
    });

    it('logs and skips a detail that cannot be fetched, without failing', async () => {
      const { deps, logger } = setup({
        incoming: [svc('s1', { dn_servicetypecode: undefined })],
        details: { s1: new HttpError(500, null) },
      });

      const services = await hydrateServices(deps, { incidentId: 'inc-1' });

      expect(services).toHaveLength(1);
      expect(services[0]?.dn_servicetypecode).toBeUndefined();
      expect(logger.entries().some((entry) => entry.level === 'warn')).toBe(true);
    });

    it('does not fetch details for services without an id', async () => {
      const { deps, getService } = setup({
        incoming: [{ statuscode: 1, statecode: 0 } as Service],
      });

      await hydrateServices(deps, { incidentId: 'inc-1' });

      expect(getService).not.toHaveBeenCalled();
    });
  });

  it('runs the enrichment on the final list', async () => {
    const enrich = vi.fn(async (services: Service[]) =>
      services.map((service) => ({ ...service, vehicleColor: 'red' })),
    );
    const { deps } = setup({ incoming: [svc('s1')], enrich });

    const services = await hydrateServices(deps, { incidentId: 'inc-1' });

    expect(enrich).toHaveBeenCalledTimes(1);
    expect(services[0]?.vehicleColor).toBe('red');
  });

  it('lets a failing incident fetch propagate, so the caller can show the error', async () => {
    const { deps, getServicesByIncidentId } = setup();
    getServicesByIncidentId.mockRejectedValueOnce(new HttpError(503, null));

    await expect(hydrateServices(deps, { incidentId: 'inc-1' })).rejects.toMatchObject({
      status: 503,
    });
  });
});
