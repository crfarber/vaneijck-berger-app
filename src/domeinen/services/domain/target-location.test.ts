import { describe, expect, it } from 'vitest';
import { checkAcceptLocation, getTargetLocation, type TargetSource } from './target-location';
import { SERVICE_TYPE } from './service-types';
import { SERVICE_STATUS } from './status';

const incident = { dn_latitude: 52.0, dn_longtitude: 5.0 };
const load = { dn_loadlatitude: 52.1, dn_loadlongitude: 5.1 };
const delivery = { dn_deliverylatitude: 52.2, dn_deliverylongitude: 5.2 };

const source = (service: TargetSource['service'], withIncident = true): TargetSource => ({
  incident: withIncident ? incident : null,
  service,
});

describe('getTargetLocation', () => {
  it('goes to the delivery location when a service has one', () => {
    expect(getTargetLocation(source({ ...load, ...delivery }))).toEqual({
      kind: 'delivery',
      coordinate: { latitude: 52.2, longitude: 5.2 },
    });
  });

  it('goes to the incident when the service has no delivery location', () => {
    expect(getTargetLocation(source({}))).toEqual({
      kind: 'incident',
      coordinate: { latitude: 52.0, longitude: 5.0 },
    });
  });

  it('has no target when nothing is known', () => {
    expect(getTargetLocation({ incident: {}, service: {} })).toBeNull();
    expect(getTargetLocation({})).toBeNull();
  });

  describe('planned transport', () => {
    const pltr = { dn_servicetypecode: SERVICE_TYPE.PLANNED_TRANSPORT };

    it('starts at the load location', () => {
      expect(
        getTargetLocation(
          source({ ...pltr, ...load, ...delivery, statuscode: SERVICE_STATUS.IN_UITVOERING }),
        ),
      ).toMatchObject({ kind: 'load' });
    });

    it('goes to the delivery location in the delivery phase', () => {
      expect(
        getTargetLocation(
          source({
            ...pltr,
            ...load,
            ...delivery,
            statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD,
          }),
        ),
      ).toMatchObject({ kind: 'delivery' });
    });

    it('stays at the load location in the delivery phase when there is no delivery location yet', () => {
      expect(
        getTargetLocation(
          source({ ...pltr, ...load, statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD }),
        ),
      ).toMatchObject({ kind: 'load' });
    });

    it('also applies to the third-party planned transport type', () => {
      expect(
        getTargetLocation(
          source({ dn_servicetypecode: SERVICE_TYPE.PLANNED_TRANSPORT_THIRD_PARTY, ...load }),
        ),
      ).toMatchObject({ kind: 'load' });
    });

    it('falls back to the delivery location and then the incident', () => {
      expect(getTargetLocation(source({ ...pltr, ...delivery }))).toMatchObject({
        kind: 'delivery',
      });
      expect(getTargetLocation(source({ ...pltr }))).toMatchObject({ kind: 'incident' });
    });
  });

  it('does not use a half location (regression: the old app accepted one usable coordinate)', () => {
    expect(
      getTargetLocation({
        incident,
        service: { dn_deliverylatitude: 52.2, dn_deliverylongitude: null },
      }),
    ).toMatchObject({ kind: 'incident' });
  });

  it('treats a non-numeric type code as no planned transport', () => {
    expect(
      getTargetLocation(source({ dn_servicetypecode: '1012', ...load, ...delivery })),
    ).toMatchObject({ kind: 'delivery' });
  });
});

describe('checkAcceptLocation', () => {
  const nearby = { isValid: true, latitude: 52.0, longitude: 5.0 };

  it('needs no confirmation without an incident or a service', () => {
    expect(checkAcceptLocation({ incident: null, service: {} }, nearby)).toEqual({
      action: 'proceed',
    });
    expect(checkAcceptLocation({ incident: {}, service: null }, nearby)).toEqual({
      action: 'proceed',
    });
    expect(checkAcceptLocation({}, null)).toEqual({ action: 'proceed' });
  });

  it('needs no confirmation when the berger is at the incident', () => {
    expect(checkAcceptLocation(source({}), nearby)).toEqual({ action: 'proceed' });
  });

  it('needs confirmation when the berger is far away', () => {
    expect(
      checkAcceptLocation(source({}), { isValid: true, latitude: 53, longitude: 5 }),
    ).toMatchObject({
      action: 'confirm',
      reason: 'too-far',
    });
  });

  it('needs confirmation when the position of the berger is unknown', () => {
    expect(checkAcceptLocation(source({}), null)).toEqual({
      action: 'confirm',
      reason: 'no-current-location',
    });
  });

  it('needs confirmation when the destination is unknown', () => {
    expect(checkAcceptLocation({ incident: {}, service: {} }, nearby)).toEqual({
      action: 'confirm',
      reason: 'no-target-location',
    });
  });
});
