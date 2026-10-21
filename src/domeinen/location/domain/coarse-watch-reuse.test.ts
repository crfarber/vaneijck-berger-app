import { describe, expect, it } from 'vitest';
import { resolveCoarseWatchReuse } from './coarse-watch-reuse';
import type { LocationSample } from './fresh-sample';
import { LOCATION_ACCURACY } from './location-accuracy';

const sample: LocationSample = {
  latitude: 52.1,
  longitude: 5.1,
  accuracyMeters: 40,
  readAt: 1_000,
};

describe('resolveCoarseWatchReuse', () => {
  it('returns the watch sample for a coarse one-shot read', () => {
    expect(resolveCoarseWatchReuse(sample, { accuracy: LOCATION_ACCURACY.coarse })).toEqual({
      isValid: true,
      latitude: 52.1,
      longitude: 5.1,
    });
  });

  it('returns null when there is no watch sample yet', () => {
    expect(resolveCoarseWatchReuse(null, { accuracy: LOCATION_ACCURACY.coarse })).toBeNull();
  });

  it('returns null for fine accuracy so photo coords stay one-shot', () => {
    expect(resolveCoarseWatchReuse(sample, { accuracy: LOCATION_ACCURACY.fine })).toBeNull();
    expect(resolveCoarseWatchReuse(sample, undefined)).toBeNull();
  });

  it('returns null for the accept wait path', () => {
    expect(
      resolveCoarseWatchReuse(sample, {
        accuracy: LOCATION_ACCURACY.coarse,
        maxAgeMs: 5_000,
        requiredAccuracyMeters: 500,
      }),
    ).toBeNull();
  });
});
