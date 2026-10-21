import * as Location from 'expo-location';
import type { Clock, Scheduler } from '@/shared/platform/ports';
import type { Logger } from '@/shared/logging/logger';
import { resolveCoarseWatchReuse } from '../../domain/coarse-watch-reuse';
import { ACCEPT_LOCATION_WAIT_TIMEOUT_MS, type LocationSample } from '../../domain/fresh-sample';
import { LOCATION_ACCURACY, type LocationAccuracy } from '../../domain/location-accuracy';
import type { CurrentLocation } from '../../domain/proximity';
import type { LocationReader } from '../../service/location-reader';
import { waitForFreshSample } from '../../service/wait-for-fresh-sample';

const WATCH_TIME_INTERVAL_MS = 2_000;

const toExpoAccuracy = (accuracy: LocationAccuracy): Location.LocationAccuracy =>
  accuracy === LOCATION_ACCURACY.coarse ? Location.Accuracy.Low : Location.Accuracy.High;

export type ExpoLocationReaderDeps = {
  clock: Clock;
  scheduler: Scheduler;
  logger?: Logger;
};

/**
 * Foreground-only reads. One-shot `getCurrent` uses High/Low accuracy for photos and depot sort;
 * coarse reads reuse a warm watch sample when one exists. Accept passes `maxAgeMs` /
 * `requiredAccuracyMeters` and reads from a Balanced watch that `start` / `stop` keep alive while
 * the services detail screen is focused — no background mode, nothing posted to the backend. Asks
 * the system dialog only while permission is undetermined.
 */
export function createExpoLocationReader(deps: ExpoLocationReaderDeps): LocationReader {
  const { clock, scheduler, logger } = deps;

  let refCount = 0;
  let subscription: Location.LocationSubscription | null = null;
  let startInFlight: Promise<void> | null = null;
  let latest: LocationSample | null = null;
  const listeners = new Set<(sample: LocationSample) => void>();

  const publish = (sample: LocationSample): void => {
    latest = sample;
    for (const listener of listeners) {
      listener(sample);
    }
  };

  const ensurePermission = async (): Promise<boolean> => {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'undetermined') {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    }
    return status === 'granted';
  };

  const startWatch = async (): Promise<void> => {
    if (subscription !== null) {
      return;
    }
    if (startInFlight !== null) {
      await startInFlight;
      return;
    }
    startInFlight = (async () => {
      try {
        if (!(await ensurePermission())) {
          return;
        }
        if (refCount === 0 || subscription !== null) {
          return;
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: WATCH_TIME_INTERVAL_MS,
            distanceInterval: 0,
          },
          (position) => {
            const accuracy = position.coords.accuracy;
            publish({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: typeof accuracy === 'number' ? accuracy : Number.NaN,
              readAt: clock.now(),
            });
          },
        );
      } catch (error) {
        logger?.warn('app', 'Could not start the location watch', { error });
      } finally {
        startInFlight = null;
      }
    })();
    await startInFlight;
  };

  const stopWatch = (): void => {
    subscription?.remove();
    subscription = null;
    latest = null;
  };

  return {
    async start() {
      refCount += 1;
      if (refCount === 1) {
        await startWatch();
      }
    },

    stop() {
      if (refCount === 0) {
        return;
      }
      refCount -= 1;
      if (refCount === 0) {
        stopWatch();
      }
    },

    async getCurrent(options): Promise<CurrentLocation> {
      try {
        if (!(await ensurePermission())) {
          return { isValid: false };
        }

        const maxAgeMs = options?.maxAgeMs;
        const requiredAccuracyMeters = options?.requiredAccuracyMeters;
        if (maxAgeMs !== undefined && requiredAccuracyMeters !== undefined) {
          return waitForFreshSample({
            getLatest: () => latest,
            subscribe: (listener) => {
              listeners.add(listener);
              return () => {
                listeners.delete(listener);
              };
            },
            clock,
            scheduler,
            waitTimeoutMs: ACCEPT_LOCATION_WAIT_TIMEOUT_MS,
            options: { maxAgeMs, requiredAccuracyMeters },
          });
        }

        const reused = resolveCoarseWatchReuse(latest, options);
        if (reused !== null) {
          return reused;
        }

        const accuracy = options?.accuracy ?? LOCATION_ACCURACY.fine;
        const position = await Location.getCurrentPositionAsync({
          accuracy: toExpoAccuracy(accuracy),
        });
        return {
          isValid: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (error) {
        logger?.warn('app', 'Could not read the current location', { error });
        return { isValid: false };
      }
    },
  };
}
