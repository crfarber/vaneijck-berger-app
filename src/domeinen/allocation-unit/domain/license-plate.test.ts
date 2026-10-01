import { describe, expect, it } from 'vitest';
import {
  applyLicensePlateInput,
  displayVehicleRegistration,
  formatLicensePlate,
  isDutchLicensePlate,
  normalizeLicensePlate,
} from './license-plate';

describe('normalizeLicensePlate', () => {
  it('upper-cases and strips everything but letters and digits', () => {
    expect(normalizeLicensePlate('ab-12 cd')).toBe('AB12CD');
    expect(normalizeLicensePlate(' 9-xxx-99. ')).toBe('9XXX99');
  });

  it('returns an empty string for nothing useful', () => {
    expect(normalizeLicensePlate('--')).toBe('');
  });
});

describe('isDutchLicensePlate', () => {
  it.each([
    ['XX-99-99', 'AB1234'],
    ['99-99-XX', '1234AB'],
    ['99-XX-99', '12AB34'],
    ['XX-99-XX', 'AB12CD'],
    ['XX-XX-99', 'ABCD12'],
    ['99-XX-XX', '12ABCD'],
    ['99-XXX-9', '12ABC3'],
    ['9-XXX-99', '1ABC23'],
    ['XX-999-X', 'AB123C'],
    ['X-999-XX', 'A123BC'],
    ['XXX-99-X', 'ABC12D'],
    ['X-99-XXX', 'A12BCD'],
    ['9-XX-999', '1AB234'],
    ['999-XX-9', '123AB4'],
  ])('accepts layout %s (%s)', (_layout, plate) => {
    expect(isDutchLicensePlate(plate)).toBe(true);
  });

  it('accepts a plate with hyphens and lower case', () => {
    expect(isDutchLicensePlate('ab-12-cd')).toBe(true);
  });

  it.each([['AB12C'], ['AB12CDE'.slice(0, 5)], ['ABCDEF'], ['123456'], ['A1B2C3'], ['']])(
    'rejects %j',
    (plate) => {
      expect(isDutchLicensePlate(plate)).toBe(false);
    },
  );
});

describe('formatLicensePlate', () => {
  it.each([
    ['ab12cd', 'AB-12-CD'],
    ['1234ab', '12-34-AB'],
    ['12abc3', '12-ABC-3'],
    ['1abc23', '1-ABC-23'],
    ['ab123c', 'AB-123-C'],
    ['a123bc', 'A-123-BC'],
    ['abc12d', 'ABC-12-D'],
    ['a12bcd', 'A-12-BCD'],
    ['1ab234', '1-AB-234'],
    ['123ab4', '123-AB-4'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatLicensePlate(input)).toBe(expected);
  });

  it('formats a plate while it is being typed', () => {
    expect(formatLicensePlate('a')).toBe('A');
    expect(formatLicensePlate('ab')).toBe('AB');
    expect(formatLicensePlate('ab1')).toBe('AB-1');
    expect(formatLicensePlate('ab12')).toBe('AB-12');
    expect(formatLicensePlate('ab12c')).toBe('AB-12-C');
    expect(formatLicensePlate('12a')).toBe('12-A');
    expect(formatLicensePlate('1abc')).toBe('1-ABC');
  });

  it('gives back input without letters or digits unchanged', () => {
    expect(formatLicensePlate('--')).toBe('--');
    expect(formatLicensePlate('')).toBe('');
  });

  it('falls back to the common 2-2-2 grouping when no layout fits', () => {
    expect(formatLicensePlate('a1b2c3')).toBe('A1-B2-C3');
  });

  it('does not truncate input longer than a plate', () => {
    expect(formatLicensePlate('ab12cdef')).toBe('AB-12-CDEF');
  });
});

describe('applyLicensePlateInput', () => {
  it('formats and validates a complete plate', () => {
    expect(applyLicensePlateInput('ab12cd')).toEqual({
      raw: 'AB12CD',
      formatted: 'AB-12-CD',
      isValid: true,
    });
  });

  it('reports a complete but impossible plate as invalid', () => {
    expect(applyLicensePlateInput('abcdef')).toMatchObject({ raw: 'ABCDEF', isValid: false });
  });

  it('reports an incomplete plate as not yet valid or invalid', () => {
    expect(applyLicensePlateInput('ab1')).toEqual({ raw: 'AB1', formatted: 'AB-1', isValid: null });
    expect(applyLicensePlateInput('')).toEqual({ raw: '', formatted: '', isValid: null });
  });

  it('cuts input at six characters', () => {
    expect(applyLicensePlateInput('AB12CD99')).toEqual({
      raw: 'AB12CD',
      formatted: 'AB-12-CD',
      isValid: true,
    });
  });
});

describe('displayVehicleRegistration', () => {
  it('formats a valid Dutch plate and marks it as dutch', () => {
    expect(displayVehicleRegistration('ab-12-cd')).toEqual({
      text: 'AB-12-CD',
      variant: 'dutch',
    });
  });

  it('shows a non-Dutch registration as upper-case foreign text', () => {
    expect(displayVehicleRegistration('ve-01')).toEqual({ text: 'VE-01', variant: 'foreign' });
  });

  it('treats blank input as an empty foreign plate', () => {
    expect(displayVehicleRegistration('   ')).toEqual({ text: '', variant: 'foreign' });
  });
});
