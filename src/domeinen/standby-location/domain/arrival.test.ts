import { describe, expect, it } from 'vitest';
import { isWithinStandbyDistance } from './arrival';

const target = { latitude: 52.0, longitude: 5.0 };

describe('isWithinStandbyDistance', () => {
  it('is false without a current position', () => {
    expect(isWithinStandbyDistance(null, target)).toBe(false);
  });

  it('is true inside 500 meters', () => {
    // ~111 m north
    expect(isWithinStandbyDistance({ latitude: 52.001, longitude: 5.0 }, target)).toBe(true);
  });

  it('is false at or beyond 500 meters', () => {
    // ~0.00449 degrees ≈ 500 m
    expect(isWithinStandbyDistance({ latitude: 52.0045, longitude: 5.0 }, target)).toBe(false);
  });
});
