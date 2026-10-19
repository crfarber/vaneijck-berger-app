import { describe, expect, it } from 'vitest';
import { hasBlockingAllocationItems } from './blocking';

describe('hasBlockingAllocationItems', () => {
  it('is false when the overview is empty', () => {
    expect(
      hasBlockingAllocationItems({ activeCount: 0, pendingCount: 0, vehicleReleaseCount: 0 }),
    ).toBe(false);
  });

  it.each([
    { activeCount: 1, pendingCount: 0, vehicleReleaseCount: 0 },
    { activeCount: 0, pendingCount: 2, vehicleReleaseCount: 0 },
    { activeCount: 0, pendingCount: 0, vehicleReleaseCount: 1 },
  ])('is true when any bucket has items %#', (counts) => {
    expect(hasBlockingAllocationItems(counts)).toBe(true);
  });
});
