import type { CurrentLocation } from '../domain/proximity';
import type { GetCurrentLocationOptions } from '../domain/location-accuracy';

/**
 * Reads the device's current position. Never throws: a denied permission or no GPS fix is just
 * another way of not having a position (`isValid: false`), exactly like the old app's own
 * `useLatestLocation` — the confirmation dialog for "no current location" already exists in
 * `decideProximity` and does not care why the position is missing.
 *
 * Callers that only need a rough fix (e.g. sorting depots by distance) pass `accuracy: 'coarse'`.
 * Default is fine GPS for the 500 m accept boundary and photo coordinates.
 */
export type LocationReader = {
  getCurrent(options?: GetCurrentLocationOptions): Promise<CurrentLocation>;
};
