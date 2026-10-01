import { describe, expect, it } from 'vitest';
import { ALLOCATION_TYPE_KEYS, getAllocationTypeKey } from './type';

describe('getAllocationTypeKey', () => {
  it('maps known codes', () => {
    expect(getAllocationTypeKey(1012)).toBe('plannedTransport');
    expect(getAllocationTypeKey(1004)).toBe('salvage');
    expect(getAllocationTypeKey(9000)).toBe('vehicleRelease');
    expect(getAllocationTypeKey(1030)).toBe('plannedTransportThirdParty');
  });

  it('returns unknown for other codes and missing values', () => {
    expect(getAllocationTypeKey(0)).toBe('unknown');
    expect(getAllocationTypeKey(4242)).toBe('unknown');
    expect(getAllocationTypeKey(undefined)).toBe('unknown');
    expect(getAllocationTypeKey(null)).toBe('unknown');
  });

  it('has a unique key per code', () => {
    const keys = Object.values(ALLOCATION_TYPE_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
