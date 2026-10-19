import { describe, expect, it } from 'vitest';
import {
  ACCEPT_LOCATION_MAX_AGE_MS,
  ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
  resolveFreshSample,
  type LocationSample,
} from './fresh-sample';

const OPTIONS = {
  maxAgeMs: ACCEPT_LOCATION_MAX_AGE_MS,
  requiredAccuracyMeters: ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
} as const;

const NOW = 1_000_000;

function sample(overrides: Partial<LocationSample> = {}): LocationSample {
  return {
    latitude: 52.09,
    longitude: 5.12,
    accuracyMeters: 100,
    readAt: NOW,
    ...overrides,
  };
}

describe('resolveFreshSample', () => {
  it('returns coordinates when the sample is fresh and accurate enough for 500 m', () => {
    expect(resolveFreshSample(sample(), NOW, OPTIONS)).toEqual({
      latitude: 52.09,
      longitude: 5.12,
    });
  });

  it('accepts a sample just inside the age and accuracy limits', () => {
    expect(
      resolveFreshSample(
        sample({
          accuracyMeters: ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS - 1,
          readAt: NOW - ACCEPT_LOCATION_MAX_AGE_MS,
        }),
        NOW,
        OPTIONS,
      ),
    ).toEqual({ latitude: 52.09, longitude: 5.12 });
  });

  it('rejects a missing sample', () => {
    expect(resolveFreshSample(null, NOW, OPTIONS)).toBeNull();
  });

  it('rejects a sample that is older than the max age', () => {
    expect(
      resolveFreshSample(sample({ readAt: NOW - ACCEPT_LOCATION_MAX_AGE_MS - 1 }), NOW, OPTIONS),
    ).toBeNull();
  });

  it('rejects a sample whose uncertainty is at least 500 m', () => {
    expect(
      resolveFreshSample(
        sample({ accuracyMeters: ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS }),
        NOW,
        OPTIONS,
      ),
    ).toBeNull();
  });

  it('rejects a sample with a missing or non-finite uncertainty', () => {
    expect(resolveFreshSample(sample({ accuracyMeters: Number.NaN }), NOW, OPTIONS)).toBeNull();
    expect(
      resolveFreshSample(sample({ accuracyMeters: Number.POSITIVE_INFINITY }), NOW, OPTIONS),
    ).toBeNull();
    expect(resolveFreshSample(sample({ accuracyMeters: -1 }), NOW, OPTIONS)).toBeNull();
  });
});
