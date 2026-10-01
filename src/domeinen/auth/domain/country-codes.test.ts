import { describe, expect, it } from 'vitest';
import { en, nl } from '@/shared/i18n/resources';
import {
  countryForDialCode,
  DEFAULT_COUNTRY_CODE,
  LOGIN_COUNTRIES,
  matchDialPrefix,
} from './country-codes';

describe('LOGIN_COUNTRIES', () => {
  it('defaults to the Netherlands', () => {
    expect(LOGIN_COUNTRIES[0]).toEqual({ id: 'NL', dialCode: '+31', flag: '🇳🇱' });
    expect(DEFAULT_COUNTRY_CODE).toBe('+31');
    expect(countryForDialCode(DEFAULT_COUNTRY_CODE)?.id).toBe('NL');
  });

  it('has unique ids and dial codes', () => {
    const ids = LOGIN_COUNTRIES.map((country) => country.id);
    const codes = LOGIN_COUNTRIES.map((country) => country.dialCode);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has no dial code that is a prefix of another, so typing +31 does not steal +351', () => {
    for (const left of LOGIN_COUNTRIES) {
      for (const right of LOGIN_COUNTRIES) {
        if (left.id === right.id) {
          continue;
        }
        expect(right.dialCode.startsWith(left.dialCode)).toBe(false);
      }
    }
  });

  it('has a translated name for every country', () => {
    for (const country of LOGIN_COUNTRIES) {
      expect(nl.login.countries[country.id].trim()).not.toBe('');
      expect(en.login.countries[country.id].trim()).not.toBe('');
    }
  });
});

describe('countryForDialCode', () => {
  it('finds a country by its dial code', () => {
    expect(countryForDialCode('+32')?.id).toBe('BE');
    expect(countryForDialCode(' +49 ')?.id).toBe('DE');
  });

  it('returns nothing for an unknown code', () => {
    expect(countryForDialCode('+1')).toBeUndefined();
    expect(countryForDialCode('31')).toBeUndefined();
  });
});

describe('matchDialPrefix', () => {
  it('picks the longest matching prefix', () => {
    expect(matchDialPrefix('351234567890')).toEqual({
      country: expect.objectContaining({ id: 'PT', dialCode: '+351' }),
      rest: '234567890',
    });
    expect(matchDialPrefix('31612345678')).toEqual({
      country: expect.objectContaining({ id: 'NL', dialCode: '+31' }),
      rest: '612345678',
    });
  });

  it('matches a prefix with nothing left (the user typed only the country code)', () => {
    expect(matchDialPrefix('31')).toEqual({
      country: expect.objectContaining({ id: 'NL' }),
      rest: '',
    });
  });

  it('does not match a national number that starts with zero', () => {
    expect(matchDialPrefix('0612345678')).toBeNull();
  });

  it('returns nothing for empty input or an unknown prefix', () => {
    expect(matchDialPrefix('')).toBeNull();
    expect(matchDialPrefix('999123456')).toBeNull();
  });
});
