import { describe, expect, it } from 'vitest';
import { mergeHydratedServices, mergePreferFilled, mergeService } from './merge';
import type { Service } from './types';

const service = (fields: Partial<Service> & { statuscode?: number }): Service => ({
  statuscode: 875920000,
  statecode: 0,
  ...fields,
});

describe('mergePreferFilled', () => {
  it('takes new values over old ones', () => {
    expect(mergePreferFilled({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
  });

  it('does not let empty values wipe filled ones', () => {
    expect(
      mergePreferFilled<Record<string, unknown>>(
        { a: 'x', b: 'y', c: 5 },
        { a: null, b: '', c: undefined },
      ),
    ).toEqual({
      a: 'x',
      b: 'y',
      c: 5,
    });
  });

  it('accepts an empty value when nothing was there', () => {
    expect(mergePreferFilled<Record<string, unknown>>({ a: null }, { a: '' })).toEqual({ a: '' });
  });

  it('keeps zero and false as real values', () => {
    expect(mergePreferFilled({ a: 5, b: true }, { a: 0, b: false })).toEqual({ a: 0, b: false });
  });

  it('merges nested objects field by field', () => {
    const merged = mergePreferFilled(
      { vehicle: { color: 'red', brand: 'VW' } } as Record<string, unknown>,
      { vehicle: { color: null, brand: 'Audi' } },
    );
    expect(merged).toEqual({ vehicle: { color: 'red', brand: 'Audi' } });
  });

  it('replaces arrays as a whole', () => {
    expect(mergePreferFilled({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] });
  });

  it('does not change its inputs', () => {
    const existing = { a: 1, nested: { b: 2 } };
    const incoming = { a: 2, nested: { b: 3 } };
    mergePreferFilled(existing, incoming);
    expect(existing).toEqual({ a: 1, nested: { b: 2 } });
    expect(incoming).toEqual({ a: 2, nested: { b: 3 } });
  });
});

describe('mergeService', () => {
  it('returns the incoming service when nothing existed', () => {
    const incoming = service({ dn_serviceid: 's1' });
    expect(mergeService(undefined, incoming)).toBe(incoming);
  });

  it('keeps rich fields that the thinner payload leaves empty', () => {
    const existing = service({
      dn_serviceid: 's1',
      dn_concatlicenseplate: 'AB-12-CD',
      dn_servicetypecode: 1004,
    });
    const incoming = service({
      dn_serviceid: 's1',
      dn_concatlicenseplate: '',
      dn_servicetypecode: undefined,
    });

    const merged = mergeService(existing, incoming);

    expect(merged.dn_concatlicenseplate).toBe('AB-12-CD');
    expect(merged.dn_servicetypecode).toBe(1004);
  });

  it('always follows the server for the lifecycle fields', () => {
    const existing = service({ dn_serviceid: 's1', statuscode: 875920000, statecode: 0 });
    const incoming = service({ dn_serviceid: 's1', statuscode: 875920005, statecode: 1 });

    const merged = mergeService(existing, incoming);

    expect(merged.statuscode).toBe(875920005);
    expect(merged.statecode).toBe(1);
  });
});

describe('mergeHydratedServices', () => {
  it('lets the incoming list decide which services exist', () => {
    const merged = mergeHydratedServices(
      [service({ dn_serviceid: 'old' }), service({ dn_serviceid: 'keep' })],
      [service({ dn_serviceid: 'keep' }), service({ dn_serviceid: 'new' })],
    );

    expect(merged.map((entry) => entry.dn_serviceid)).toEqual(['keep', 'new']);
  });

  it('merges each service with its earlier version', () => {
    const merged = mergeHydratedServices(
      [service({ dn_serviceid: 's1', dn_concatlicenseplate: 'AB-12-CD' })],
      [service({ dn_serviceid: 's1', dn_concatlicenseplate: null as unknown as string })],
    );

    expect(merged[0]?.dn_concatlicenseplate).toBe('AB-12-CD');
  });

  it('passes services without an id through unchanged', () => {
    const anonymous = service({});
    expect(mergeHydratedServices([service({ dn_serviceid: 's1' })], [anonymous])).toEqual([
      anonymous,
    ]);
  });

  it('handles missing earlier data', () => {
    const incoming = [service({ dn_serviceid: 's1' })];
    expect(mergeHydratedServices(null, incoming)).toEqual(incoming);
    expect(mergeHydratedServices(undefined, incoming)).toEqual(incoming);
  });
});
