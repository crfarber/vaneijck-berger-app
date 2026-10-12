import { describe, expect, it } from 'vitest';
import {
  isPostalAddressLookupReady,
  normalizeDutchPostalCode,
  parsePostalAddressLookupResponse,
} from './postal-address-lookup';

describe('postal address lookup', () => {
  it('normalizes a complete Dutch postal code', () => {
    expect(normalizeDutchPostalCode('1234ab')).toBe('1234 AB');
    expect(normalizeDutchPostalCode('1234 AB')).toBe('1234 AB');
    expect(normalizeDutchPostalCode('123')).toBeNull();
  });

  it('allows lookup when the optional house number addition is omitted', () => {
    expect(isPostalAddressLookupReady('1234 AB', '12')).toBe(true);
  });

  it('requires a valid Dutch postal code and numeric house number before lookup', () => {
    expect(isPostalAddressLookupReady('1234 AB', '')).toBe(false);
    expect(isPostalAddressLookupReady('1234 AB', '12A')).toBe(false);
    expect(isPostalAddressLookupReady('1234', '12')).toBe(false);
  });

  it('parses the current formatted response into a structured address', () => {
    expect(
      parsePostalAddressLookupResponse('Dorpsstraat 1, 1234 AB Voorbeeld', {
        postalCode: '1234ab',
        houseNumber: '1',
        houseNumberAddition: '',
      }),
    ).toMatchObject({
      formatted: 'Dorpsstraat 1, 1234 AB Voorbeeld',
      street: 'Dorpsstraat',
      houseNumber: '1',
      postalCode: '1234 AB',
      city: 'Voorbeeld',
      countryIso2: 'NL',
    });
  });

  it('parses the legacy JSON-string response without requiring extra API fields', () => {
    expect(
      parsePostalAddressLookupResponse(
        JSON.stringify({ results: [{ city: 'Utrecht', street: 'Teststraat' }] }),
        {
          postalCode: '1234 AB',
          houseNumber: '12',
          houseNumberAddition: 'A',
        },
      ),
    ).toMatchObject({
      formatted: 'Teststraat 12A, 1234 AB Utrecht',
      street: 'Teststraat',
      houseNumber: '12',
      houseNumberAddition: 'A',
      postalCode: '1234 AB',
      city: 'Utrecht',
    });
  });

  it('rejects malformed or incomplete responses', () => {
    const input = { postalCode: '1234 AB', houseNumber: '1', houseNumberAddition: '' };

    expect(parsePostalAddressLookupResponse('not an address', input)).toBeNull();
    expect(parsePostalAddressLookupResponse('{"results":[]}', input)).toBeNull();
  });
});
