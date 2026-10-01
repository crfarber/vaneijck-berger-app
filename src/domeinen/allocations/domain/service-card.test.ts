import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS } from '@/domeinen/services';
import { resolveServiceCardModel } from './service-card';
import type { Incident, Service } from './types';

function service(overrides: Record<string, unknown> = {}): Service {
  return {
    statuscode: 1,
    statecode: 0,
    dn_servicetypecode: 1007,
    dn_servicenumber: 'PECH-2026000207-TEST',
    dn_concatlicenseplate: '2dae406',
    dn_vehiclebrand: 'Abarth',
    dn_vehicletradename: '500',
    '_dn_clientid_value@OData.Community.Display.V1.FormattedValue': 'Europ Assistance Belgium',
    dn_drivertelephonenumber1: '0612345678',
    dn_driverfullname: 'Nina Brovc',
    ...overrides,
  } as Service;
}

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    dn_incidentid: 'inc-1',
    statuscode: 1,
    dn_latitude: 52.1,
    dn_longtitude: 5.1,
    ...overrides,
  };
}

describe('resolveServiceCardModel', () => {
  it('keeps vehicle lines separate and uses the driver phone for calling', () => {
    expect(resolveServiceCardModel(service())).toEqual({
      kind: 'standard',
      typeKey: 'breakdownAssistance',
      number: 'PECH-2026000207-TEST',
      party: 'Europ Assistance Belgium',
      driverName: 'Nina Brovc',
      phone: '0612345678',
      vehicle: {
        plate: '2DAE406',
        brand: 'ABARTH',
        tradeName: '500',
      },
    });
  });

  it('reads the driver name from dn_driverfullname and trims it', () => {
    expect(
      resolveServiceCardModel(
        service({
          dn_driverfullname: '  Nina Brovc  ',
          dn_drivername: 'Wrong field',
        }),
      ).driverName,
    ).toBe('Nina Brovc');
    expect(
      resolveServiceCardModel(
        service({
          dn_driverfullname: null,
          dn_drivername: 'Should be ignored',
        }),
      ).driverName,
    ).toBeUndefined();
  });

  it('picks delivery coordinates in the delivery phase', () => {
    const model = resolveServiceCardModel(
      service({
        statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD,
        dn_deliverylatitude: 52.2,
        dn_deliverylongitude: 5.2,
        dn_loadinglocationlatitude: 51.9,
        dn_loadinglocationlongitude: 4.5,
      }),
      incident(),
    );
    expect(model.coordinate).toEqual({ latitude: 52.2, longitude: 5.2 });
  });

  it('falls back from load coordinates to the incident location', () => {
    expect(resolveServiceCardModel(service(), incident()).coordinate).toEqual({
      latitude: 52.1,
      longitude: 5.1,
    });
    expect(
      resolveServiceCardModel(
        service({
          dn_loadinglocationlatitude: 51.9,
          dn_loadinglocationlongitude: 4.5,
        }),
        incident(),
      ).coordinate,
    ).toEqual({ latitude: 51.9, longitude: 4.5 });
  });

  it('selects the PLTR profile and handles missing optional values', () => {
    expect(
      resolveServiceCardModel(
        service({
          dn_servicetypecode: 1030,
          dn_servicenumber: null,
          dn_driverfullname: null,
          dn_drivertelephonenumber1: null,
          dn_vehiclebrand: null,
          dn_vehicletradename: null,
          '_dn_clientid_value@OData.Community.Display.V1.FormattedValue': null,
        }),
      ),
    ).toEqual({
      kind: 'pltr',
      typeKey: 'plannedTransportThirdParty',
      vehicle: { plate: '2DAE406' },
    });
  });
});
