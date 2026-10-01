import { describe, expect, it } from 'vitest';
import { findNetherlandsCountry, matchVehicleBrand, matchVehicleType } from './lookup-match';

describe('findNetherlandsCountry', () => {
  it('finds Netherlands by iso code', () => {
    expect(
      findNetherlandsCountry([
        { dn_name: 'België', dn_countryid: 'be-id', dn_iso2code: 'BE' },
        { dn_name: 'Nederland', dn_countryid: 'nl-id', dn_iso2code: 'NL' },
      ]),
    ).toEqual({
      displayName: 'Nederland',
      valueData: 'nl-id',
    });
  });

  it('uses Text/Value columns when dn_name contains a guid', () => {
    expect(
      findNetherlandsCountry([
        {
          dn_name: '934cf459-e62f-e711-8106-5065f38b95f1',
          Text: 'Nederland',
          Value: '934cf459-e62f-e711-8106-5065f38b95f1',
          dn_iso2code: 'NL',
        },
      ]),
    ).toEqual({
      displayName: 'Nederland',
      valueData: '934cf459-e62f-e711-8106-5065f38b95f1',
    });
  });
});

describe('matchVehicleBrand', () => {
  it('matches brand case-insensitively', () => {
    expect(
      matchVehicleBrand('NISSAN', [
        { dn_name: 'Nissan', dn_vehiclebrandid: 'brand-id' },
        { dn_name: 'Toyota', dn_vehiclebrandid: 'other-id' },
      ]),
    ).toEqual({
      displayName: 'Nissan',
      valueData: 'brand-id',
    });
  });

  it('returns null when multiple fuzzy matches exist', () => {
    expect(
      matchVehicleBrand('FO', [
        { dn_name: 'Ford', dn_vehiclebrandid: '1' },
        { dn_name: 'Foton', dn_vehiclebrandid: '2' },
      ]),
    ).toBeNull();
  });
});

describe('matchVehicleType', () => {
  it('matches type after stripping brand prefix', () => {
    expect(
      matchVehicleType(
        'NISSAN JUKE',
        'NISSAN',
        [
          {
            dn_name: 'Juke',
            dn_vehicletypeid: 'type-id',
            _dn_vehiclebrandid_value: 'brand-id',
          },
        ],
        'brand-id',
      ),
    ).toEqual({
      displayName: 'Juke',
      valueData: 'type-id',
    });
  });
});
