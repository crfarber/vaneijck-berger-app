import { describe, expect, it } from 'vitest';
import { addressLines, parseConcatenatedAddress } from './address';

describe('addressLines', () => {
  it('splits a CRM concatenated location into street and locality lines', () => {
    expect(addressLines({ dn_concatlocation: 'Havenweg 12\n3011 AA Rotterdam' })).toEqual([
      'Havenweg 12',
      '3011 AA Rotterdam',
    ]);
  });

  it('builds street and locality lines from structured fields', () => {
    expect(
      addressLines({
        dn_street: 'Havenweg',
        dn_housenumber: '12',
        dn_housenumberadditions: 'A',
        dn_postalcodeid: '3011 AA',
        dn_city: 'Rotterdam',
        dn_country: 'Nederland',
      }),
    ).toEqual(['Havenweg 12 A', '3011 AA, Rotterdam']);
  });

  it('uses structured address fields when CRM concatenation is also present', () => {
    expect(
      addressLines({
        dn_concatlocation: 'Havenweg 12 A, 3011 AA, Rotterdam Nederland',
        dn_street: 'Havenweg',
        dn_housenumber: '12',
        dn_housenumberadditions: 'A',
        dn_postalcodeid: '3011 AA',
        dn_city: 'Rotterdam',
      }),
    ).toEqual(['Havenweg 12 A', '3011 AA, Rotterdam']);
  });
});

describe('parseConcatenatedAddress', () => {
  it('keeps a street addition and extracts country from the final segment', () => {
    expect(parseConcatenatedAddress('Kaai 8 bis, 1111 AA, Delft Nederland')).toEqual({
      streetLine: 'Kaai 8 bis',
      localityLine: '1111 AA, Delft',
      country: 'Nederland',
    });
  });

  it('returns no address for a blank value', () => {
    expect(parseConcatenatedAddress('  ')).toBeUndefined();
  });
});
