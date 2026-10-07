import { describe, expect, it, vi } from 'vitest';
import type { RdwApi } from '@/domeinen/rdw';
import type { Service } from '../domain/types';
import { enrichServicesWithRdw } from './enrich-services-with-rdw';

const service = (fields: Partial<Service> = {}): Service => ({
  statuscode: 875920000,
  statecode: 0,
  dn_serviceid: 'service-1',
  ...fields,
});

function setup(response: Awaited<ReturnType<RdwApi['lookupByRegistrationNumber']>> = null) {
  const rdwApi: RdwApi = {
    lookupByRegistrationNumber: vi.fn(async () => response),
  };
  return { rdwApi, lookupByRegistrationNumber: rdwApi.lookupByRegistrationNumber };
}

describe('enrichServicesWithRdw', () => {
  it('does not look up RDW when a brand is already present', async () => {
    const { rdwApi } = setup();
    const input = service({
      dn_concatlicenseplate: 'AB-123-C',
      dn_vehiclebrand: 'Handmatig merk',
    });

    await expect(enrichServicesWithRdw([input], rdwApi)).resolves.toEqual([input]);
    expect(rdwApi.lookupByRegistrationNumber).not.toHaveBeenCalled();
  });

  it('fills available vehicle fields for a Dutch plate without replacing existing values', async () => {
    const { rdwApi } = setup({ model: 'Nissan', tradeName: 'Juke', primaryColor: ' Zwart ' });
    const input = service({
      dn_concatlicenseplate: 'ab123c',
      dn_vehicletradename: 'Handmatig model',
      dn_vwe_vehicleinformationid: { vwe_rdw_kleur1: null },
    });

    await expect(enrichServicesWithRdw([input], rdwApi)).resolves.toEqual([
      {
        ...input,
        dn_vehiclebrand: 'Nissan',
        dn_vehicletradename: 'Handmatig model',
        dn_vwe_vehicleinformationid: { vwe_rdw_kleur1: 'Zwart' },
      },
    ]);
    expect(rdwApi.lookupByRegistrationNumber).toHaveBeenCalledExactlyOnceWith('AB-123-C');
  });

  it.each(['', 'XX-123-XX'])('skips an empty or non-Dutch plate (%j)', async (plate) => {
    const { rdwApi } = setup();

    const result = await enrichServicesWithRdw([service({ dn_concatlicenseplate: plate })], rdwApi);

    expect(result[0]?.dn_vehiclebrand).toBeUndefined();
    expect(rdwApi.lookupByRegistrationNumber).not.toHaveBeenCalled();
  });

  it('leaves the service unchanged when RDW has no data or fails', async () => {
    const input = service({ dn_concatlicenseplate: 'AB-123-C' });
    const noMatch = setup();
    await expect(enrichServicesWithRdw([input], noMatch.rdwApi)).resolves.toEqual([input]);

    const failing: RdwApi = {
      lookupByRegistrationNumber: vi.fn(async () => {
        throw new Error('RDW unavailable');
      }),
    };
    await expect(enrichServicesWithRdw([input], failing)).resolves.toEqual([input]);
  });

  it('fills only fields present in a partial RDW response', async () => {
    const { rdwApi } = setup({ tradeName: 'Juke' });
    const input = service({ dn_concatlicenseplate: 'AB-123-C' });

    const result = await enrichServicesWithRdw([input], rdwApi);

    expect(result[0]).toMatchObject({ dn_vehicletradename: 'Juke' });
    expect(result[0]?.dn_vehiclebrand).toBeUndefined();
    expect(result[0]?.dn_vwe_vehicleinformationid).toBeUndefined();
  });

  it('looks up a repeated plate only once per service batch', async () => {
    const { rdwApi } = setup({ model: 'Nissan' });
    const services = [
      service({ dn_serviceid: 'service-1', dn_concatlicenseplate: 'AB-123-C' }),
      service({ dn_serviceid: 'service-2', dn_concatlicenseplate: 'AB123C' }),
    ];

    const result = await enrichServicesWithRdw(services, rdwApi);

    expect(rdwApi.lookupByRegistrationNumber).toHaveBeenCalledExactlyOnceWith('AB-123-C');
    expect(result.map((item) => item.dn_vehiclebrand)).toEqual(['Nissan', 'Nissan']);
  });
});
