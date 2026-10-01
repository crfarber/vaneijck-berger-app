import type { CurrentLocation } from '../domain/proximity';

/**
 * Reads the device's current position. Never throws: a denied permission or no GPS fix is just
 * another way of not having a position (`isValid: false`), exactly like the old app's own
 * `useLatestLocation` — the confirmation dialog for "no current location" already exists in
 * `decideProximity` and does not care why the position is missing.
 */
export type LocationReader = {
  getCurrent(): Promise<CurrentLocation>;
};
