import type { Clock, Scheduler } from '@/shared/platform/ports';
import {
  resolveFreshSample,
  type FreshSampleOptions,
  type LocationSample,
} from '../domain/fresh-sample';
import type { CurrentLocation } from '../domain/proximity';

export type WaitForFreshSampleDeps = {
  getLatest(): LocationSample | null;
  subscribe(listener: (sample: LocationSample) => void): () => void;
  clock: Clock;
  scheduler: Scheduler;
  waitTimeoutMs: number;
  options: FreshSampleOptions;
};

/**
 * Returns a usable current location from the latest watch sample, or waits until one arrives
 * within `waitTimeoutMs`. Times out as `{ isValid: false }` so accept can show the existing
 * "no current location" confirmation.
 */
export function waitForFreshSample(deps: WaitForFreshSampleDeps): Promise<CurrentLocation> {
  const { getLatest, subscribe, clock, scheduler, waitTimeoutMs, options } = deps;

  const fromSample = (sample: LocationSample | null): CurrentLocation | null => {
    const coordinate = resolveFreshSample(sample, clock.now(), options);
    if (coordinate === null) {
      return null;
    }
    return { isValid: true, latitude: coordinate.latitude, longitude: coordinate.longitude };
  };

  const immediate = fromSample(getLatest());
  if (immediate !== null) {
    return Promise.resolve(immediate);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: CurrentLocation): void => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      cancelTimeout();
      resolve(value);
    };

    const unsubscribe = subscribe((sample) => {
      const next = fromSample(sample);
      if (next !== null) {
        finish(next);
      }
    });

    const cancelTimeout = scheduler.schedule(() => {
      finish({ isValid: false });
    }, waitTimeoutMs);
  });
}
