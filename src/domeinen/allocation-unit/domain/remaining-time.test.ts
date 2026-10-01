import { describe, expect, it } from 'vitest';
import { getRemainingMinutes } from './remaining-time';

describe('getRemainingMinutes', () => {
  it('rounds up the remaining time', () => {
    expect(
      getRemainingMinutes('2026-09-24T16:15:30.000Z', Date.parse('2026-09-24T15:14:00.000Z')),
    ).toBe(62);
  });

  it('does not return negative time after the deadline', () => {
    expect(
      getRemainingMinutes('2026-09-24T15:00:00.000Z', Date.parse('2026-09-24T15:14:00.000Z')),
    ).toBe(0);
  });

  it('returns null for an absent or invalid deadline', () => {
    expect(getRemainingMinutes(null, 0)).toBeNull();
    expect(getRemainingMinutes('invalid', 0)).toBeNull();
  });
});
