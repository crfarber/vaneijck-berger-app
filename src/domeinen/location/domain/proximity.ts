import { distanceInMeters, toCoordinate, type Coordinate } from './geo';

/** Accepting a service closer than this to where it takes place needs no confirmation. */
export const PROXIMITY_THRESHOLD_METERS = 500;

/** The last known position of the device, as reported by the location module. */
export type CurrentLocation = {
  isValid: boolean;
  latitude?: unknown;
  longitude?: unknown;
} | null;

export type ConfirmReason = 'no-current-location' | 'no-target-location' | 'too-far';

export type ProximityDecision =
  | { action: 'proceed' }
  /** The berger must confirm before going on; the screen shows the message that belongs to the reason. */
  | { action: 'confirm'; reason: ConfirmReason; distanceMeters?: number };

/** A usable position of the device, or null when it is unknown or not valid. */
export function resolveCurrentPosition(current: CurrentLocation): Coordinate | null {
  return current?.isValid === true ? toCoordinate(current.latitude, current.longitude) : null;
}

/**
 * Decides whether an action at `target` needs a confirmation from the berger: only when the
 * position is unknown, the destination is unknown, or the berger is 500 meters or more away.
 */
export function decideProximity(
  current: Coordinate | null,
  target: Coordinate | null,
): ProximityDecision {
  if (current === null) {
    return { action: 'confirm', reason: 'no-current-location' };
  }
  if (target === null) {
    return { action: 'confirm', reason: 'no-target-location' };
  }
  const distanceMeters = distanceInMeters(current, target);
  return distanceMeters < PROXIMITY_THRESHOLD_METERS
    ? { action: 'proceed' }
    : { action: 'confirm', reason: 'too-far', distanceMeters };
}
