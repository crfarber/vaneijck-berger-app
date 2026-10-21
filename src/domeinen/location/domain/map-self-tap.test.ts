import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SELF_TAP_THRESHOLD_METERS,
  isSelfMapTap,
  selfTapThresholdMeters,
} from './map-self-tap';

describe('selfTapThresholdMeters', () => {
  it('falls back when the viewport size is missing or invalid', () => {
    expect(selfTapThresholdMeters(undefined)).toBe(DEFAULT_SELF_TAP_THRESHOLD_METERS);
    expect(selfTapThresholdMeters(0)).toBe(DEFAULT_SELF_TAP_THRESHOLD_METERS);
    expect(selfTapThresholdMeters(-1)).toBe(DEFAULT_SELF_TAP_THRESHOLD_METERS);
  });

  it('grows with a wider viewport and stays within bounds', () => {
    expect(selfTapThresholdMeters(0.01)).toBeGreaterThanOrEqual(80);
    expect(selfTapThresholdMeters(1)).toBeLessThanOrEqual(2_000);
    expect(selfTapThresholdMeters(0.05)).toBeGreaterThan(selfTapThresholdMeters(0.01));
  });
});

describe('isSelfMapTap', () => {
  const self = { latitude: 52.09, longitude: 5.12 };

  it('accepts a tap on the live position', () => {
    expect(isSelfMapTap(self, self)).toBe(true);
  });

  it('rejects a tap far from the live position', () => {
    expect(isSelfMapTap({ latitude: 52.2, longitude: 5.3 }, self)).toBe(false);
  });

  it('accepts a nearby tap within the default threshold', () => {
    // ~90 m north of self
    expect(isSelfMapTap({ latitude: 52.0908, longitude: 5.12 }, self)).toBe(true);
  });
});
