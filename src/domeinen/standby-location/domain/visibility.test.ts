import { describe, expect, it } from 'vitest';
import { isStandbyBannerVisible } from './visibility';
import type { StandbyLocationAdvice } from './types';

const advice: StandbyLocationAdvice = {
  standbyLocationId: '1',
  latitude: 52,
  longitude: 5,
  receivedAt: '2026-10-19T10:00:00.000Z',
};

describe('isStandbyBannerVisible', () => {
  it('shows only active advice without blocking items', () => {
    expect(
      isStandbyBannerVisible({
        status: 'active',
        pendingAdvice: advice,
        hasBlockingItems: false,
      }),
    ).toBe(true);
  });

  it.each([
    { status: 'expired' as const, pendingAdvice: advice, hasBlockingItems: false },
    { status: 'active' as const, pendingAdvice: null, hasBlockingItems: false },
    { status: 'active' as const, pendingAdvice: advice, hasBlockingItems: true },
    { status: null, pendingAdvice: advice, hasBlockingItems: false },
  ])('hides otherwise %#', (input) => {
    expect(isStandbyBannerVisible(input)).toBe(false);
  });
});
