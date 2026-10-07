import { describe, expect, it } from 'vitest';
import { parsePhaseNumbersParam } from './phase-numbers-param';

describe('parsePhaseNumbersParam', () => {
  it('parses a comma-separated list of phase numbers', () => {
    expect(parsePhaseNumbersParam('1,2')).toEqual([1, 2]);
    expect(parsePhaseNumbersParam('1')).toEqual([1]);
  });

  it('returns undefined when the param is missing or empty', () => {
    expect(parsePhaseNumbersParam(undefined)).toBeUndefined();
    expect(parsePhaseNumbersParam('')).toBeUndefined();
    expect(parsePhaseNumbersParam('  ')).toBeUndefined();
  });

  it('drops non-numeric segments', () => {
    expect(parsePhaseNumbersParam('1,x,2')).toEqual([1, 2]);
    expect(parsePhaseNumbersParam('a,b')).toBeUndefined();
  });
});
