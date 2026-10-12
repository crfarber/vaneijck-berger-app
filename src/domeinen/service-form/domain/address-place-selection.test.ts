import { describe, expect, it } from 'vitest';
import type { StructuredAddress } from '@/domeinen/places';
import {
  buildAddressPlaceAnswers,
  resolveCountryAnswer,
  withCountryInAddressSummary,
} from './address-place-selection';

const address: StructuredAddress = {
  name: 'Van Eijck',
  formatted: 'Teststraat 1, 1234 AB Utrecht, Nederland',
  street: 'Teststraat',
  houseNumber: '1',
  houseNumberAddition: 'A',
  postalCode: '1234 AB',
  city: 'Utrecht',
  province: 'Utrecht',
  countryIso2: 'NL',
};

describe('addressPlaceSelection', () => {
  it('maps country iso code to lookup answer', () => {
    expect(
      resolveCountryAnswer('NL', [
        { dn_iso2code: 'NL', dn_countryid: 'nl-id', dn_name: 'Nederland' },
      ]),
    ).toEqual({
      value: 'nl-id',
      displayValue: 'Nederland',
      table: 'dn_country',
    });
    expect(
      resolveCountryAnswer('nl', [
        { dn_iso2code: 'NL', dn_countryid: 'nl-id', dn_name: 'Nederland' },
      ]),
    ).toEqual({
      value: 'nl-id',
      displayValue: 'Nederland',
      table: 'dn_country',
    });
  });

  it('appends country to an address summary when missing', () => {
    expect(withCountryInAddressSummary('Teststraat 1, 1234 AB Utrecht', 'Nederland')).toBe(
      'Teststraat 1, 1234 AB Utrecht, Nederland',
    );
    expect(
      withCountryInAddressSummary('Teststraat 1, 1234 AB Utrecht, Nederland', 'Nederland'),
    ).toBe('Teststraat 1, 1234 AB Utrecht, Nederland');
  });

  it('applies a postal lookup with NL country into answers and summary text', () => {
    const postalAddress: StructuredAddress = {
      name: '',
      formatted: 'Dorpsstraat 12, 1234 AB Voorbeeld',
      street: 'Dorpsstraat',
      houseNumber: '12',
      houseNumberAddition: '',
      postalCode: '1234 AB',
      city: 'Voorbeeld',
      province: '',
      countryIso2: 'NL',
    };
    const countries = [{ dn_iso2code: 'NL', dn_countryid: 'nl-id', dn_name: 'Nederland' }];
    const updates = buildAddressPlaceAnswers(
      'dn_postalcode',
      postalAddress,
      {
        postalcode: 'dn_postalcode',
        houseno: 'dn_houseno',
        street: 'dn_street',
        city: 'dn_city',
        country: 'dn_country',
      },
      countries,
    );
    const countryAnswer = resolveCountryAnswer(postalAddress.countryIso2, countries);

    expect(updates.dn_street).toEqual({ value: 'Dorpsstraat', displayValue: 'Dorpsstraat' });
    expect(updates.dn_city).toEqual({ value: 'Voorbeeld', displayValue: 'Voorbeeld' });
    expect(updates.dn_country).toEqual({
      value: 'nl-id',
      displayValue: 'Nederland',
      table: 'dn_country',
    });
    expect(
      withCountryInAddressSummary(postalAddress.formatted, countryAnswer?.displayValue as string),
    ).toBe('Dorpsstraat 12, 1234 AB Voorbeeld, Nederland');
  });

  it('builds CRM answers for all mapped address components', () => {
    const updates = buildAddressPlaceAnswers(
      'dn_deliveryadressbar',
      address,
      {
        name: 'dn_deliveryname',
        country: '_dn_deliverycountryid_value',
        postalcode: 'dn_deliverypostalcode',
        houseno: 'dn_deliveryhouseno',
        housenoadd: 'dn_deliveryhousenoaddition',
        street: 'dn_deliverystreet',
        city: 'dn_deliverycity',
        province: 'dn_deliveryprovince',
      },
      [{ dn_iso2code: 'NL', dn_countryid: 'nl-id', dn_name: 'Nederland' }],
    );

    expect(updates.dn_deliveryadressbar).toEqual({
      value: address.formatted,
      displayValue: address.formatted,
    });
    expect(updates.dn_deliveryname).toEqual({
      value: 'Van Eijck',
      displayValue: 'Van Eijck',
    });
    expect(updates.dn_deliverystreet).toEqual({
      value: 'Teststraat',
      displayValue: 'Teststraat',
    });
    expect(updates.dn_deliveryhouseno).toEqual({
      value: '1',
      displayValue: '1',
    });
    expect(updates.dn_deliveryhousenoaddition).toEqual({
      value: 'A',
      displayValue: 'A',
    });
    expect(updates.dn_deliveryprovince).toEqual({
      value: 'Utrecht',
      displayValue: 'Utrecht',
    });
    expect(updates._dn_deliverycountryid_value).toEqual({
      value: 'nl-id',
      displayValue: 'Nederland',
      table: 'dn_country',
    });
  });
});
