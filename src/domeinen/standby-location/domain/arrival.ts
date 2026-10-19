import { distanceInMeters, PROXIMITY_THRESHOLD_METERS, type Coordinate } from '@/domeinen/location';

/**
 * True when the berger is strictly inside the 500 m radius of the standby location (same threshold
 * as service accept). Missing current position means not arrived.
 */
export function isWithinStandbyDistance(current: Coordinate | null, target: Coordinate): boolean {
  if (current === null) {
    return false;
  }
  return distanceInMeters(current, target) < PROXIMITY_THRESHOLD_METERS;
}
