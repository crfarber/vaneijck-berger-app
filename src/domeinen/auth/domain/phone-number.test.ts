import { describe, expect, it } from 'vitest';
import {
  applyPhoneInput,
  isPlausiblePhoneNumber,
  languageForCountryCode,
  normalizePhoneNumber,
} from './phone-number';

describe('normalizePhoneNumber', () => {
  it.each([
    ['+31', '0612345678', '+31612345678'],
    ['+31', '06 12 34 56 78', '+31612345678'],
    ['+31', '06-12345678', '+31612345678'],
    ['+31', '612345678', '+31612345678'],
    ['+32', '0470123456', '+32470123456'],
    ['+32', '032123456', '+3232123456'], // 9 digits with a zero: the old app kept the zero here
    ['+49', '1512345678', '+491512345678'], // 10 digits without a zero: the old app cut the "1"
    ['+31', '(06) 1234 5678', '+31612345678'],
  ])('%s + %s = %s', (countryCode, input, expected) => {
    expect(normalizePhoneNumber(countryCode, input)).toBe(expected);
  });

  it('removes only one leading zero', () => {
    expect(normalizePhoneNumber('+31', '00612345678')).toBe('+310612345678');
  });

  it('trims the country code', () => {
    expect(normalizePhoneNumber(' +31 ', '0612345678')).toBe('+31612345678');
  });
});

describe('isPlausiblePhoneNumber', () => {
  it('accepts a normal Dutch mobile number', () => {
    expect(isPlausiblePhoneNumber('+31', '0612345678')).toBe(true);
  });

  it('rejects input that is too short', () => {
    expect(isPlausiblePhoneNumber('+31', '0612')).toBe(false);
    expect(isPlausiblePhoneNumber('+31', '')).toBe(false);
  });

  it('rejects input that is too long', () => {
    expect(isPlausiblePhoneNumber('+31', '0123456789012345')).toBe(false);
  });

  it('rejects an invalid country code', () => {
    expect(isPlausiblePhoneNumber('31', '0612345678')).toBe(false);
    expect(isPlausiblePhoneNumber('+0', '0612345678')).toBe(false);
  });

  it('ignores punctuation when counting digits', () => {
    expect(isPlausiblePhoneNumber('+31', '--- 06 ---')).toBe(false);
  });
});

describe('languageForCountryCode', () => {
  it('uses Dutch for the Netherlands and Belgium', () => {
    expect(languageForCountryCode('+31')).toBe('nl');
    expect(languageForCountryCode('+32')).toBe('nl');
  });

  it('uses English for everything else', () => {
    expect(languageForCountryCode('+49')).toBe('en');
    expect(languageForCountryCode('+48')).toBe('en');
  });
});

describe('applyPhoneInput', () => {
  it('keeps a national number with the selected country', () => {
    expect(applyPhoneInput('+31', '06 1234 5678')).toEqual({
      countryCode: '+31',
      nationalNumber: '06 1234 5678',
    });
  });

  it('splits an international number with + and selects that country', () => {
    expect(applyPhoneInput('+31', '+32 470 12 34 56')).toEqual({
      countryCode: '+32',
      nationalNumber: '470123456',
    });
  });

  it('treats 00 as an international prefix', () => {
    expect(applyPhoneInput('+31', '0031612345678')).toEqual({
      countryCode: '+31',
      nationalNumber: '612345678',
    });
  });

  it('does not apply the country code twice when the number already starts with it', () => {
    expect(applyPhoneInput('+31', '31612345678')).toEqual({
      countryCode: '+31',
      nationalNumber: '612345678',
    });
  });

  it('selects Portugal for +351, not the Netherlands', () => {
    expect(applyPhoneInput('+31', '+351234567890')).toEqual({
      countryCode: '+351',
      nationalNumber: '234567890',
    });
  });

  it('selects the country as soon as only the prefix is typed with +', () => {
    expect(applyPhoneInput('+49', '+31')).toEqual({
      countryCode: '+31',
      nationalNumber: '',
    });
  });

  it('does not steal a short national number that happens to start with 31', () => {
    expect(applyPhoneInput('+31', '31')).toEqual({
      countryCode: '+31',
      nationalNumber: '31',
    });
  });

  it('leaves unknown prefixes in the number field', () => {
    expect(applyPhoneInput('+31', '+999123456')).toEqual({
      countryCode: '+31',
      nationalNumber: '+999123456',
    });
  });
});
