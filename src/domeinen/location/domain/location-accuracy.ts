/**
 * How precise a one-shot position read needs to be.
 * - `fine`: accept/proximity and photo coordinates (metres matter).
 * - `coarse`: depot distance sort (~1 km is enough; faster than a high-accuracy GPS fix).
 */
export const LOCATION_ACCURACY = {
  fine: 'fine',
  coarse: 'coarse',
} as const;

export type LocationAccuracy = (typeof LOCATION_ACCURACY)[keyof typeof LOCATION_ACCURACY];

export type GetCurrentLocationOptions = {
  accuracy?: LocationAccuracy;
};
