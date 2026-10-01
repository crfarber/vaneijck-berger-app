import { describe, expect, it } from 'vitest';
import { utcStringFromEpoch } from './utc';

describe('utcStringFromEpoch', () => {
  it('formats the injected epoch, not the wall clock', () => {
    expect(utcStringFromEpoch(Date.UTC(2026, 8, 21, 12, 0, 0))).toBe(
      'Mon, 21 Sep 2026 12:00:00 GMT',
    );
  });
});
