import { describe, expect, it } from 'vitest';
import { getServiceContact, getServiceParty, getServiceVehicle } from './service-summary';

describe('service summaries', () => {
  it('normalizes vehicle, party and contact details once for every card profile', () => {
    const service = {
      dn_concatlicenseplate: 'ab-12-cd',
      dn_vehiclebrand: 'Daf',
      dn_vehicletradename: 'Xf',
      dn_vwe_vehicleinformationid: { vwe_rdw_kleur1: 'grijs' },
      dn_driverfullname: 'Jan de Vries',
      dn_registrationownertelephonenumber1: '0612345678',
      '_dn_clientid_value@OData.Community.Display.V1.FormattedValue': 'Van Eijck',
      '_dn_insurancecompanyid_value@OData.Community.Display.V1.FormattedValue': 'Nationale',
    };

    expect(getServiceVehicle(service)).toEqual({
      plate: 'AB-12-CD',
      description: 'DAF XF',
      color: 'GRIJS',
    });
    expect(getServiceParty(service)).toBe('Van Eijck / Nationale');
    expect(getServiceContact(service)).toEqual({ name: 'Jan de Vries', phone: '0612345678' });
  });

  it('never exposes a raw Dynamics lookup id as a party label', () => {
    expect(getServiceParty({ _dn_clientid_value: 'guid-only' })).toBeUndefined();
    expect(getServiceContact({})).toBeUndefined();
  });
});
