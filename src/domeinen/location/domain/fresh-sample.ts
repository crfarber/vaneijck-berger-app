import { PROXIMITY_THRESHOLD_METERS } from './proximity';

/** How old a watch sample may be when accepting a service (same place, not the drive there). */
export const ACCEPT_LOCATION_MAX_AGE_MS = 5_000;

/**
 * How precise a watch sample must be for the 500 m accept boundary. Matches the proximity
 * threshold: a fix that is itself uncertain by 500 m or more cannot decide that radius.
 */
export const ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS = PROXIMITY_THRESHOLD_METERS;

/** How long accept waits for a usable watch update before treating the position as unknown. */
export const ACCEPT_LOCATION_WAIT_TIMEOUT_MS = 10_000;

/** One device reading with the age and uncertainty the accept check needs. */
export type LocationSample = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  readAt: number;
};

export type FreshSampleOptions = {
  maxAgeMs: number;
  requiredAccuracyMeters: number;
};

/**
 * Returns the coordinates when the sample is young enough and accurate enough for the 500 m
 * accept check; otherwise null so the caller waits for a better reading.
 */
export function resolveFreshSample(
  sample: LocationSample | null,
  now: number,
  options: FreshSampleOptions,
): { latitude: number; longitude: number } | null {
  if (sample === null) {
    return null;
  }
  if (!Number.isFinite(sample.accuracyMeters) || sample.accuracyMeters < 0) {
    return null;
  }
  if (sample.accuracyMeters >= options.requiredAccuracyMeters) {
    return null;
  }
  if (now - sample.readAt > options.maxAgeMs) {
    return null;
  }
  return { latitude: sample.latitude, longitude: sample.longitude };
}
