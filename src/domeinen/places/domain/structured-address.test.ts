import { describe, expect, it } from 'vitest';
import { toStructuredAddress, type PlaceAddressSource } from './structured-address';

const details: PlaceAddressSource = {
  name: 'Van Eijck',
  formattedAddress: 'Teststraat 1A, 1234 AB Utrecht, Nederland',
  addressComponents: [
    { types: ['route'], long_name: 'Teststraat', short_name: 'Teststr.' },
    { types: ['street_number'], long_name: '1A', short_name: '1A' },
    { types: ['postal_code'], long_name: '1234 AB', short_name: '1234 AB' },
    { types: ['locality'], long_name: 'Utrecht', short_name: 'Utrecht' },
    {
      types: ['administrative_area_level_1'],
      long_name: 'Utrecht',
      short_name: 'UT',
    },
    { types: ['country'], long_name: 'Nederland', short_name: 'NL' },
  ],
};

describe('toStructuredAddress', () => {
  it('maps Google components into reusable address parts', () => {
    expect(toStructuredAddress(details)).toEqual({
      name: 'Van Eijck',
      formatted: 'Teststraat 1A, 1234 AB Utrecht, Nederland',
      street: 'Teststraat',
      houseNumber: '1',
      houseNumberAddition: 'A',
      postalCode: '1234 AB',
      city: 'Utrecht',
      province: 'Utrecht',
      countryIso2: 'NL',
    });
  });

  it('falls back to the prediction description when formatted address is missing', () => {
    const withoutFormatted: PlaceAddressSource = {
      name: 'Depot',
      addressComponents: [],
    };
    expect(toStructuredAddress(withoutFormatted, 'Depot, Amsterdam').formatted).toBe(
      'Depot, Amsterdam',
    );
  });
});
