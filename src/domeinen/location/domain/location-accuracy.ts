/**
 * How precise a one-shot position read needs to be.
 * - `fine`: photo coordinates and the GPS status sheet (metres matter).
 * - `coarse`: depot distance sort (~1 km is enough; faster than a high-accuracy GPS fix).
 *
 * Accept proximity does not use these one-shot levels: it asks for a fresh watch sample via
 * `maxAgeMs` / `requiredAccuracyMeters` instead.
 */
export const LOCATION_ACCURACY = {
  fine: 'fine',
  coarse: 'coarse',
} as const;

export type LocationAccuracy = (typeof LOCATION_ACCURACY)[keyof typeof LOCATION_ACCURACY];

export type GetCurrentLocationOptions = {
  accuracy?: LocationAccuracy;
  /**
   * When set with `requiredAccuracyMeters`, `getCurrent` returns a watch sample that is at most
   * this old, or waits for the next usable update (accept / 500 m check).
   */
  maxAgeMs?: number;
  /** Maximum accepted horizontal uncertainty for a watch sample used with `maxAgeMs`. */
  requiredAccuracyMeters?: number;
};
