import { describe, expect, it } from 'vitest';
import { parseStandbyLocationAdvice } from './parse';

describe('parseStandbyLocationAdvice', () => {
  it('reads camelCase coordinates and address fields', () => {
    expect(
      parseStandbyLocationAdvice({
        standbyLocationId: 'loc-1',
        name: 'Depot',
        latitude: '52.34151',
        longitude: '4.95544',
        street: 'Diemerkade',
        houseNo: '12',
        city: 'DIEMEN',
        postalCode: '1111AB',
      }),
    ).toEqual({
      standbyLocationId: 'loc-1',
      name: 'Depot',
      latitude: 52.34151,
      longitude: 4.95544,
      street: 'Diemerkade',
      houseNo: '12',
      city: 'DIEMEN',
      postalCode: '1111AB',
    });
  });

  it('accepts PascalCase address keys', () => {
    expect(
      parseStandbyLocationAdvice({
        StandbyLocationId: 'loc-2',
        Latitude: 52.1,
        Longitude: 5.1,
        Street: 'A',
        HouseNo: '1',
        City: 'Utrecht',
        PostalCode: '3500AA',
        Name: 'Test',
      }),
    ).toMatchObject({
      standbyLocationId: 'loc-2',
      name: 'Test',
      latitude: 52.1,
      longitude: 5.1,
      street: 'A',
      houseNo: '1',
      city: 'Utrecht',
      postalCode: '3500AA',
    });
  });

  it('returns null without usable coordinates', () => {
    expect(parseStandbyLocationAdvice({ standbyLocationId: 'x' })).toBeNull();
    expect(parseStandbyLocationAdvice({ latitude: 0, longitude: 0 })).toBeNull();
    expect(parseStandbyLocationAdvice({ latitude: 'nope', longitude: 4 })).toBeNull();
  });

  it('allows an empty standbyLocationId when coordinates are valid', () => {
    expect(parseStandbyLocationAdvice({ latitude: 52, longitude: 5 })?.standbyLocationId).toBe('');
  });
});
