import { describe, expect, it } from 'vitest';
import { isPltrType, SERVICE_TYPE } from './service-types';

describe('isPltrType', () => {
  it('recognises both planned-transport codes, including 1030 which the old list opened as a normal service screen', () => {
    expect(isPltrType(SERVICE_TYPE.PLANNED_TRANSPORT)).toBe(true);
    expect(isPltrType(SERVICE_TYPE.PLANNED_TRANSPORT_THIRD_PARTY)).toBe(true);
  });

  it('rejects other types and missing values', () => {
    expect(isPltrType(SERVICE_TYPE.BERGING)).toBe(false);
    expect(isPltrType(SERVICE_TYPE.AFGIFTE)).toBe(false);
    expect(isPltrType(0)).toBe(false);
    expect(isPltrType(undefined)).toBe(false);
    expect(isPltrType(null)).toBe(false);
  });
});
