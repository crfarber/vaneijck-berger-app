import { describe, expect, it } from 'vitest';
import { getExitTarget } from './exit-target';
import {
  buildPltrCards,
  externalMapLinks,
  pltrPartyLabel,
  pltrPrimaryAction,
  pltrVehicle,
  type PltrRecord,
} from './pltr';
import { SERVICE_TYPE } from './service-types';
import { SERVICE_STATUS } from './status';

const loadAddress = {
  dn_total_servicestartlocation: 'Havenweg 12, 1234 AB, Rotterdam',
  dn_loadinglocationname: 'Terminal',
  dn_loadinglocationstreet: 'Havenweg',
  dn_loadinglocationhouseno: '12',
  dn_loadinglocationpostalcode: '1234 AB',
  dn_loadinglocationcity: 'Rotterdam',
  '_dn_loadinglocationcountryid_value@OData.Community.Display.V1.FormattedValue': 'Nederland',
  dn_loadinglocationlatitude: 51.9,
  dn_loadinglocationlongitude: 4.5,
  dn_loadinglocationphoneno: '0101234567',
};

const deliveryAddress = {
  dn_total_servicedeliverylocation: 'Loskade 4, 5678 CD, Utrecht',
  dn_deliveryname: 'Depot',
  dn_deliverystreet: 'Loskade',
  dn_deliveryhouseno: '4',
  dn_deliverypostalcode: '5678 CD',
  dn_deliverycity: 'Utrecht',
  '_dn_deliverycountryid_value@OData.Community.Display.V1.FormattedValue': 'Nederland',
  dn_deliverylatitude: 52.1,
  dn_deliverylongitude: 5.1,
  dn_deliverylocationphoneno: '0307654321',
};

function service(statuscode: number, extra: PltrRecord = {}): PltrRecord {
  return { statuscode, ...loadAddress, ...deliveryAddress, ...extra };
}

describe('pltrPrimaryAction', () => {
  it('walks accept, load, delivery and the closing screen', () => {
    expect(pltrPrimaryAction(SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP)).toBe('accept');
    expect(pltrPrimaryAction(SERVICE_STATUS.NOG_AANSTUREN)).toBe('start-load');
    expect(pltrPrimaryAction(SERVICE_STATUS.IN_UITVOERING)).toBe('start-load');
    expect(pltrPrimaryAction(SERVICE_STATUS.HULPVERLENING_AKKOORD)).toBe('start-delivery');
    expect(pltrPrimaryAction(SERVICE_STATUS.HULPVERLENING_AFGEROND)).toBe('finish');
    expect(pltrPrimaryAction(SERVICE_STATUS.LAATSTE_BERICHT)).toBe('completed');
  });

  it('hides the button when the status has no step (the old screen still showed "next")', () => {
    expect(pltrPrimaryAction(SERVICE_STATUS.VERGEEFSE_RIT)).toBeNull();
    expect(pltrPrimaryAction(SERVICE_STATUS.NACONTROLE)).toBeNull();
    expect(pltrPrimaryAction(undefined)).toBeNull();
    expect(pltrPrimaryAction(0)).toBeNull();
  });
});

describe('finishing a PLTR', () => {
  it('returns to the allocation list from the closing screen, for both PLTR types', () => {
    for (const serviceTypeCode of [
      SERVICE_TYPE.PLANNED_TRANSPORT,
      SERVICE_TYPE.PLANNED_TRANSPORT_THIRD_PARTY,
    ]) {
      expect(
        getExitTarget({
          exitKind: 'terminal',
          fromProcessingFinish: true,
          allocationId: 'alloc-1',
          serviceId: 'svc-1',
          serviceTypeCode,
          services: [{ dn_serviceid: 'svc-1', statuscode: SERVICE_STATUS.IN_UITVOERING }],
        }),
      ).toEqual({ kind: 'allocation' });
    }
  });

  it('comes back to the PLTR screen after the load phase, while another phase remains', () => {
    expect(
      getExitTarget({
        exitKind: 'continueIncident',
        allocationId: 'alloc-1',
        serviceId: 'svc-1',
        serviceTypeCode: SERVICE_TYPE.PLANNED_TRANSPORT_THIRD_PARTY,
        services: [{ dn_serviceid: 'svc-1', statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD }],
      }),
    ).toMatchObject({ kind: 'incident', variant: 'pltr' });
  });
});

describe('buildPltrCards', () => {
  it('shows load then delivery, with navigation and a call on the current phase', () => {
    const [load, delivery] = buildPltrCards({
      service: service(SERVICE_STATUS.IN_UITVOERING),
      incident: { dn_name: 'Incident', createdon: '2026-03-15T09:30:00.000Z' },
    });

    expect(load).toMatchObject({
      phase: 'load',
      name: 'Terminal',
      streetLine: 'Havenweg 12',
      localityLine: '1234 AB, Rotterdam',
      country: 'Nederland',
      createdOn: '2026-03-15T09:30:00.000Z',
      complete: false,
      showNavigate: true,
      showCall: true,
      phone: '0101234567',
      coordinate: { latitude: 51.9, longitude: 4.5 },
    });
    expect(delivery).toMatchObject({
      phase: 'delivery',
      name: 'Depot',
      streetLine: 'Loskade 4',
      localityLine: '5678 CD, Utrecht',
      createdOn: '2026-03-15T09:30:00.000Z',
      complete: false,
      showNavigate: false,
      showCall: false,
    });
  });

  it('omits createdOn when the incident has no usable createdon', () => {
    const [load] = buildPltrCards({
      service: service(SERVICE_STATUS.IN_UITVOERING),
      incident: { dn_name: 'Incident', createdon: 'not-a-date' },
    });
    expect(load?.createdOn).toBeUndefined();
    expect(
      buildPltrCards({
        service: service(SERVICE_STATUS.IN_UITVOERING),
        incident: { dn_name: 'Incident' },
      })[0]?.createdOn,
    ).toBeUndefined();
  });

  it('marks the load done and moves navigation and the call to delivery', () => {
    const [load, delivery] = buildPltrCards({
      service: service(SERVICE_STATUS.HULPVERLENING_AKKOORD),
      incident: null,
    });
    expect(load).toMatchObject({ complete: true, showNavigate: false, showCall: false });
    expect(delivery).toMatchObject({ complete: false, showNavigate: true, showCall: true });
  });

  it('marks both phases done once the service is finished, and still offers a call at the load', () => {
    const [load, delivery] = buildPltrCards({
      service: service(SERVICE_STATUS.HULPVERLENING_AFGEROND),
      incident: null,
    });
    expect(load).toMatchObject({ complete: true, showNavigate: false, showCall: true });
    expect(delivery).toMatchObject({ complete: true, showNavigate: false, showCall: false });
  });

  it('drops a phase that has no address, even when structured fields are present', () => {
    const cards = buildPltrCards({
      service: {
        statuscode: SERVICE_STATUS.IN_UITVOERING,
        dn_loadinglocationname: 'Terminal',
        dn_loadinglocationlatitude: 51.9,
        dn_loadinglocationlongitude: 4.5,
      },
      incident: null,
    });
    expect(cards).toEqual([]);
  });

  it('falls back to the parsed address when the structured fields are empty', () => {
    const [load] = buildPltrCards({
      service: {
        statuscode: SERVICE_STATUS.IN_UITVOERING,
        dn_total_servicestartlocation: 'Kaai 8 bis, 1111 AA, Delft Nederland',
      },
      incident: { dn_name: 'Sleepboot' },
    });
    expect(load).toMatchObject({
      name: 'Sleepboot',
      streetLine: 'Kaai 8 bis',
      localityLine: '1111 AA, Delft',
      country: 'Nederland',
      showNavigate: false,
    });
  });

  it('reads a formatted address and a comma decimal coordinate', () => {
    const [load] = buildPltrCards({
      service: {
        statuscode: SERVICE_STATUS.IN_UITVOERING,
        'dn_total_servicestartlocation@OData.Community.Display.V1.FormattedValue':
          'Weg 1,\r\n2222 BB, Amsterdam',
        dn_loadinglocationlatitude: '52,37',
        dn_loadinglocationlongitude: '4,89',
      },
      incident: null,
    });
    expect(load?.streetLine).toBe('Weg 1');
    expect(load?.coordinate).toEqual({ latitude: 52.37, longitude: 4.89 });
    expect(load?.showNavigate).toBe(true);
  });

  it('does not navigate to (0, 0)', () => {
    const [load] = buildPltrCards({
      service: service(SERVICE_STATUS.IN_UITVOERING, {
        dn_loadinglocationlatitude: 0,
        dn_loadinglocationlongitude: 0,
      }),
      incident: null,
    });
    expect(load?.coordinate).toBeNull();
    expect(load?.showNavigate).toBe(false);
  });

  it('uses one concatenated location for both phases when the specific ones are missing', () => {
    const cards = buildPltrCards({
      service: {
        statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD,
        dn_concatlocation: 'Plein 1, 3333 CC, Haarlem',
      },
      incident: { dn_concatlocation: 'Ergens anders 2, 4444 DD, Leiden' },
    });
    expect(cards.map((card) => card.streetLine)).toEqual(['Plein 1', 'Plein 1']);
  });

  it('uses the incident location when the service has none of its own', () => {
    const cards = buildPltrCards({
      service: { statuscode: SERVICE_STATUS.IN_UITVOERING },
      incident: { dn_concatlocation: 'Dijk 3, 5555 EE, Gouda', dn_name: 'Pech' },
    });
    expect(cards).toHaveLength(2);
    expect(cards[0]?.name).toBe('Pech');
    expect(cards[1]?.name).toBeUndefined();
  });

  it('turns a newline address into one line and keeps a street without a number', () => {
    const [load] = buildPltrCards({
      service: {
        statuscode: SERVICE_STATUS.IN_UITVOERING,
        dn_total_servicestartlocation: 'Industrieweg\n9999 ZZ\nBreda',
      },
      incident: null,
    });
    expect(load).toMatchObject({
      streetLine: 'Industrieweg',
      localityLine: '9999 ZZ, Breda',
    });
  });

  it('keeps a street that has no house number and a postal code without a city', () => {
    const [load] = buildPltrCards({
      service: {
        statuscode: SERVICE_STATUS.IN_UITVOERING,
        dn_total_servicestartlocation: 'Industrieweg, 9999 ZZ',
      },
      incident: null,
    });
    expect(load).toMatchObject({ streetLine: 'Industrieweg', localityLine: '9999 ZZ' });
  });

  it('ignores a blank address', () => {
    expect(
      buildPltrCards({
        service: { statuscode: SERVICE_STATUS.IN_UITVOERING, dn_total_servicestartlocation: '  ' },
        incident: { dn_concatlocation: '' },
      }),
    ).toEqual([]);
  });

  it('returns nothing without a service', () => {
    expect(buildPltrCards({ service: null, incident: { dn_name: 'X' } })).toEqual([]);
  });
});

describe('pltrVehicle', () => {
  it('uppercases the plate and the brand with the trade name', () => {
    expect(
      pltrVehicle({
        dn_concatlicenseplate: 'ab-12-cd',
        dn_vehiclebrand: 'Daf',
        dn_vehicletradename: 'Xf',
      }),
    ).toEqual({ plate: 'AB-12-CD', description: 'DAF XF' });
  });

  it('skips the description when brand or trade name is missing', () => {
    expect(pltrVehicle({ dn_vehiclebrand: 'Daf' })).toEqual({});
    expect(pltrVehicle(null)).toEqual({});
  });
});

describe('pltrPartyLabel', () => {
  it('joins the formatted client and insurer', () => {
    expect(
      pltrPartyLabel({
        '_dn_clientid_value@OData.Community.Display.V1.FormattedValue': 'Van Eijck',
        '_dn_insurancecompanyid_value@OData.Community.Display.V1.FormattedValue': 'Nationale',
      }),
    ).toBe('Van Eijck / Nationale');
  });

  it('ignores a raw lookup id', () => {
    expect(
      pltrPartyLabel({
        _dn_clientid_value: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      }),
    ).toBeUndefined();
  });

  it('returns whichever label is present', () => {
    expect(
      pltrPartyLabel({
        '_dn_insurancecompanyid_value@OData.Community.Display.V1.FormattedValue': 'Nationale',
      }),
    ).toBe('Nationale');
    expect(pltrPartyLabel(undefined)).toBeUndefined();
  });
});

describe('externalMapLinks', () => {
  it('offers Apple Maps, Google Maps and Waze for the same coordinate', () => {
    expect(externalMapLinks({ latitude: 51.9, longitude: 4.5 })).toEqual({
      apple: 'http://maps.apple.com/?ll=51.9,4.5',
      google: 'http://maps.google.com/maps?q=51.9,4.5',
      waze: 'https://waze.com/ul?ll=51.9,4.5&z=10&navigate=yes',
    });
  });
});
