import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS } from '@/domeinen/services';
import { formatIncidentAge, formatIncidentClock, resolveIncidentCardModel } from './incident-card';
import type { Allocation } from './types';

function allocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    dn_allocationid: 'alloc-1',
    statuscode: 1,
    statecode: 0,
    type: 1004,
    incident: {
      dn_incidentid: 'incident-1',
      statuscode: 1,
      dn_name: 'A2 Utrecht',
      dn_lcmnumber_vhd: '12345',
      dn_street: 'Rijksweg',
      dn_housenumber: '1',
      dn_city: 'Utrecht',
      createdon: '2026-01-01T10:00:00.000Z',
    },
    services: [{ statuscode: 1, statecode: 0, dn_servicetypecode: 1004 }],
    ...overrides,
  };
}

describe('resolveIncidentCardModel', () => {
  it('builds the standard profile with reference and fallback address', () => {
    expect(resolveIncidentCardModel(allocation())).toMatchObject({
      kind: 'standard',
      title: 'A2 Utrecht',
      typeKey: 'salvage',
      reference: '12345',
      location: ['Rijksweg 1', 'Utrecht'],
      createdOn: '2026-01-01T10:00:00.000Z',
      showNavigate: false,
    });
  });

  it('offers navigate only for an active allocation with coordinates', () => {
    const model = resolveIncidentCardModel(
      allocation({
        statuscode: 875920000,
        incident: {
          dn_incidentid: 'incident-1',
          statuscode: 1,
          dn_name: 'A2 Utrecht',
          dn_latitude: 52.09,
          dn_longtitude: 5.12,
          createdon: '2026-01-01T10:00:00.000Z',
        },
      }),
    );
    expect(model).toMatchObject({
      kind: 'standard',
      showNavigate: true,
      coordinate: { latitude: 52.09, longitude: 5.12 },
    });
  });

  it('hides navigate when the allocation is still pending', () => {
    const model = resolveIncidentCardModel(
      allocation({
        statuscode: 1,
        incident: {
          dn_incidentid: 'incident-1',
          statuscode: 1,
          dn_latitude: 52.09,
          dn_longtitude: 5.12,
          createdon: '2026-01-01T10:00:00.000Z',
        },
      }),
    );
    expect(model).toMatchObject({ kind: 'standard', showNavigate: false });
  });

  it.each([1004, 1012])('offers a customer call on an active allocation of type %s', (type) => {
    expect(
      resolveIncidentCardModel(
        allocation({
          type,
          statuscode: 875920000,
          services: [
            {
              statuscode: SERVICE_STATUS.IN_UITVOERING,
              statecode: 0,
              dn_registrationownertelephonenumber1: ' 0612345678 ',
              dn_loadinglocationphoneno: '0101234567',
            },
          ],
        }),
      ),
    ).toMatchObject({ phone: '0612345678', showCall: true });
  });

  it.each([
    [1, '0612345678'],
    [875920000, undefined],
    [875920000, '   '],
  ])(
    'hides the standard customer call without an active allocation and number (%s, %s)',
    (statuscode, phone) => {
      expect(
        resolveIncidentCardModel(
          allocation({
            statuscode,
            services: [
              {
                statuscode: SERVICE_STATUS.IN_UITVOERING,
                statecode: 0,
                dn_registrationownertelephonenumber1: phone,
              },
            ],
          }),
        ),
      ).toMatchObject({ kind: 'standard', showCall: false });
    },
  );

  it('builds the PLTR profile from the existing service type discriminator', () => {
    const model = resolveIncidentCardModel(
      allocation({
        type: 1012,
        services: [
          {
            statuscode: 1,
            statecode: 0,
            dn_servicetypecode: 1012,
            dn_concatlicenseplate: 'ab-12-cd',
          },
        ],
      }),
    );
    expect(model).toMatchObject({
      kind: 'pltr',
      location: ['Rijksweg 1', 'Utrecht'],
      vehicle: { plate: 'AB-12-CD' },
    });
  });

  it('falls back to the PLTR load address when the incident has no street fields', () => {
    const model = resolveIncidentCardModel(
      allocation({
        type: 1012,
        incident: {
          dn_incidentid: 'incident-1',
          statuscode: 1,
          dn_name: 'Planbaar transport',
          createdon: '2026-01-01T10:00:00.000Z',
        },
        services: [
          {
            statuscode: 1,
            statecode: 0,
            dn_servicetypecode: 1012,
            dn_total_servicestartlocation: 'Havenweg 12, 1234 AB, Rotterdam',
          },
        ],
      }),
    );
    expect(model).toMatchObject({
      kind: 'pltr',
      location: ['Havenweg 12', '1234 AB, Rotterdam'],
    });
  });

  it.each([SERVICE_STATUS.IN_UITVOERING, SERVICE_STATUS.HULPVERLENING_AKKOORD])(
    'offers the PLTR customer and incident address regardless of service phase (%s)',
    (status) => {
      const model = resolveIncidentCardModel(
        allocation({
          type: 1012,
          statuscode: 875920000,
          incident: {
            ...allocation().incident,
            dn_latitude: 52.09,
            dn_longtitude: 5.12,
          },
          services: [
            {
              statuscode: status,
              statecode: 0,
              dn_servicetypecode: 1012,
              dn_registrationownertelephonenumber1: ' 0612345678 ',
              dn_total_servicestartlocation: 'Havenweg 12, 1234 AB, Rotterdam',
              dn_loadinglocationlatitude: 51.9,
              dn_loadinglocationlongitude: 4.5,
              dn_loadinglocationphoneno: '0101234567',
              dn_total_servicedeliverylocation: 'Loskade 4, 5678 CD, Utrecht',
              dn_deliverylatitude: 52.1,
              dn_deliverylongitude: 5.1,
              dn_deliverylocationphoneno: '0307654321',
            },
          ],
        }),
      );
      expect(model).toMatchObject({
        kind: 'pltr',
        location: ['Rijksweg 1', 'Utrecht'],
        phone: '0612345678',
        coordinate: { latitude: 52.09, longitude: 5.12 },
        showCall: true,
        showNavigate: true,
      });
    },
  );

  it('hides PLTR actions while the allocation is pending even with contact and coordinates', () => {
    expect(
      resolveIncidentCardModel(
        allocation({
          type: 1012,
          incident: { ...allocation().incident, dn_latitude: 52.09, dn_longtitude: 5.12 },
          services: [
            {
              statuscode: SERVICE_STATUS.IN_UITVOERING,
              statecode: 0,
              dn_registrationownertelephonenumber1: '0612345678',
            },
          ],
        }),
      ),
    ).toMatchObject({ kind: 'pltr', showCall: false, showNavigate: false });
  });

  it.each([null, undefined])(
    'does not offer a PLTR call when services are missing (%s)',
    (services) => {
      const model = resolveIncidentCardModel(
        allocation({
          type: 1012,
          statuscode: 875920000,
          services,
        }),
      );
      expect(model).toMatchObject({ kind: 'pltr', showCall: false, showNavigate: false });
    },
  );

  it.each([
    ['0612345678', undefined, true, false],
    [undefined, 52.09, false, true],
    ['   ', 52.09, false, true],
    ['0612345678', 100, true, false],
  ])('offers only available PLTR shortcuts (%s, %s)', (phone, latitude, showCall, showNavigate) => {
    expect(
      resolveIncidentCardModel(
        allocation({
          type: 1012,
          statuscode: 875920000,
          incident: {
            ...allocation().incident,
            dn_latitude: latitude,
            dn_longtitude: 5.12,
          },
          services: [
            {
              statuscode: SERVICE_STATUS.IN_UITVOERING,
              statecode: 0,
              dn_total_servicestartlocation: 'Havenweg 12, 1234 AB, Rotterdam',
              dn_registrationownertelephonenumber1: phone,
              dn_loadinglocationphoneno: '0101234567',
              dn_loadinglocationlatitude: 51.9,
              dn_loadinglocationlongitude: 4.5,
            },
          ],
        }),
      ),
    ).toMatchObject({ kind: 'pltr', showCall, showNavigate });
  });

  it('falls back safely when no type or optional display data is known', () => {
    const model = resolveIncidentCardModel(
      allocation({
        type: undefined,
        services: null,
        incident: { dn_incidentid: 'incident-1', statuscode: 1, createdon: 'not-a-date' },
      }),
    );
    expect(model).toEqual({
      kind: 'standard',
      typeKey: 'unknown',
      location: [],
      showNavigate: false,
      showCall: false,
    });
  });
});

describe('formatIncidentClock', () => {
  it('formats Dutch summer time from UTC like the old card', () => {
    // 05:15Z = 07:15 in Europe/Amsterdam (CEST, UTC+2)
    expect(formatIncidentClock('2026-09-22T05:15:00.000Z', 'Europe/Amsterdam')).toEqual({
      date: '22/09/2026',
      time: '7:15',
    });
  });

  it('formats British summer time from the same UTC instant', () => {
    // 05:15Z = 06:15 in Europe/London (BST, UTC+1)
    expect(formatIncidentClock('2026-09-22T05:15:00.000Z', 'Europe/London')).toEqual({
      date: '22/09/2026',
      time: '6:15',
    });
  });

  it('hides invalid dates', () => {
    expect(formatIncidentClock('not-a-date', 'UTC')).toBeUndefined();
  });
});

describe('formatIncidentAge', () => {
  const now = Date.parse('2026-01-02T12:05:00.000Z');

  it('formats minutes, hours and days without a live status colour', () => {
    expect(formatIncidentAge('2026-01-02T12:01:00.000Z', now)).toBe('4m');
    expect(formatIncidentAge('2026-01-02T10:00:00.000Z', now)).toBe('2h 05m');
    expect(formatIncidentAge('2025-12-31T10:00:00.000Z', now)).toBe('2d 2h 05m');
  });

  it('hides invalid dates', () => {
    expect(formatIncidentAge('not-a-date', now)).toBeUndefined();
  });
});
