import { describe, expect, it } from 'vitest';
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
    });
  });
});

describe('formatIncidentClock', () => {
  it('formats date and clock time like the old card', () => {
    const clock = formatIncidentClock('2026-09-22T07:15:00.000');
    expect(clock).toEqual({ date: '22/09/2026', time: '7:15' });
  });

  it('hides invalid dates', () => {
    expect(formatIncidentClock('not-a-date')).toBeUndefined();
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
