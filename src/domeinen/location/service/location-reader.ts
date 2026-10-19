import type { CurrentLocation } from '../domain/proximity';
import type { GetCurrentLocationOptions } from '../domain/location-accuracy';

/**
 * Reads the device's current position. Never throws: a denied permission or no GPS fix is just
 * another way of not having a position (`isValid: false`), exactly like the old app's own
 * `useLatestLocation` — the confirmation dialog for "no current location" already exists in
 * `decideProximity` and does not care why the position is missing.
 *
 * Callers that only need a rough fix (e.g. sorting depots by distance) pass `accuracy: 'coarse'`.
 * Default one-shot reads use fine GPS. Accept passes `maxAgeMs` / `requiredAccuracyMeters` so the
 * reader can reuse a warm foreground watch instead of a cold high-accuracy fix.
 *
 * `start` / `stop` keep one foreground watch alive while the services / PLTR detail screen is
 * focused (reference-counted). Tests and callers that never accept can leave them as no-ops.
 */
export type LocationReader = {
  getCurrent(options?: GetCurrentLocationOptions): Promise<CurrentLocation>;
  start(): Promise<void>;
  stop(): void;
};
