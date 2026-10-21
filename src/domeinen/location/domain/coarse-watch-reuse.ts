import type { LocationSample } from './fresh-sample';
import { LOCATION_ACCURACY, type GetCurrentLocationOptions } from './location-accuracy';
import type { CurrentLocation } from './proximity';

/**
 * Coarse one-shot reads (e.g. depot distance sort) may reuse a warm foreground watch sample
 * instead of waiting on `getCurrentPositionAsync`. Accept waits use `maxAgeMs` /
 * `requiredAccuracyMeters` and must not take this shortcut.
 */
export function resolveCoarseWatchReuse(
  latest: LocationSample | null,
  options: GetCurrentLocationOptions | undefined,
): CurrentLocation | null {
  if (options?.maxAgeMs !== undefined && options.requiredAccuracyMeters !== undefined) {
    return null;
  }
  if ((options?.accuracy ?? LOCATION_ACCURACY.fine) !== LOCATION_ACCURACY.coarse) {
    return null;
  }
  if (latest === null) {
    return null;
  }
  return {
    isValid: true,
    latitude: latest.latitude,
    longitude: latest.longitude,
  };
}
