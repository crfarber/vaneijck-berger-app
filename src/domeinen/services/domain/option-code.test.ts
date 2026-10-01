import { describe, expect, it } from 'vitest';
import { hasFilledOptionCode, toOptionCode } from './option-code';

describe('hasFilledOptionCode', () => {
  it.each([[1004], [0], [-1], ['1004'], [' 7 ']])('is true for %j', (value) => {
    expect(hasFilledOptionCode(value)).toBe(true);
  });

  it.each([[null], [undefined], [''], ['   '], [Number.NaN], [true], [{}], [[]]])(
    'is false for %j',
    (value) => {
      expect(hasFilledOptionCode(value)).toBe(false);
    },
  );
});

describe('toOptionCode', () => {
  it('converts numbers and numeric strings', () => {
    expect(toOptionCode(1004)).toBe(1004);
    expect(toOptionCode('1004')).toBe(1004);
    expect(toOptionCode(' 12 ')).toBe(12);
    expect(toOptionCode(0)).toBe(0);
  });

  it.each([[null], [undefined], [''], ['  '], ['abc'], [Number.NaN], [true], [{}]])(
    'returns null for %j',
    (value) => {
      expect(toOptionCode(value)).toBeNull();
    },
  );
});
