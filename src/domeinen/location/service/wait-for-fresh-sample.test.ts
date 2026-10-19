import { describe, expect, it } from 'vitest';
import { createFakeClock, createFakeScheduler } from '@/test/fakes';
import {
  ACCEPT_LOCATION_MAX_AGE_MS,
  ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
  ACCEPT_LOCATION_WAIT_TIMEOUT_MS,
  type LocationSample,
} from '../domain/fresh-sample';
import { waitForFreshSample } from './wait-for-fresh-sample';

const OPTIONS = {
  maxAgeMs: ACCEPT_LOCATION_MAX_AGE_MS,
  requiredAccuracyMeters: ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
};

describe('waitForFreshSample', () => {
  it('returns the latest sample when it is already fresh enough', async () => {
    const clock = createFakeClock(1_000);
    const scheduler = createFakeScheduler();
    const latest: LocationSample = {
      latitude: 52.1,
      longitude: 5.1,
      accuracyMeters: 50,
      readAt: 1_000,
    };

    await expect(
      waitForFreshSample({
        getLatest: () => latest,
        subscribe: () => () => undefined,
        clock,
        scheduler,
        waitTimeoutMs: ACCEPT_LOCATION_WAIT_TIMEOUT_MS,
        options: OPTIONS,
      }),
    ).resolves.toEqual({ isValid: true, latitude: 52.1, longitude: 5.1 });
    expect(scheduler.pending()).toHaveLength(0);
  });

  it('waits for the next usable sample when the latest is too old', async () => {
    const clock = createFakeClock(10_000);
    const scheduler = createFakeScheduler();
    const listeners: Array<(sample: LocationSample) => void> = [];
    const stale: LocationSample = {
      latitude: 52.0,
      longitude: 5.0,
      accuracyMeters: 50,
      readAt: 1_000,
    };

    const waiting = waitForFreshSample({
      getLatest: () => stale,
      subscribe: (next) => {
        listeners.push(next);
        return () => undefined;
      },
      clock,
      scheduler,
      waitTimeoutMs: ACCEPT_LOCATION_WAIT_TIMEOUT_MS,
      options: OPTIONS,
    });

    expect(listeners).toHaveLength(1);
    listeners[0]?.({
      latitude: 52.2,
      longitude: 5.2,
      accuracyMeters: 80,
      readAt: 10_000,
    });

    await expect(waiting).resolves.toEqual({ isValid: true, latitude: 52.2, longitude: 5.2 });
  });

  it('returns an invalid location when no usable sample arrives before the timeout', async () => {
    const clock = createFakeClock(1_000);
    const scheduler = createFakeScheduler();

    const waiting = waitForFreshSample({
      getLatest: () => null,
      subscribe: () => () => undefined,
      clock,
      scheduler,
      waitTimeoutMs: ACCEPT_LOCATION_WAIT_TIMEOUT_MS,
      options: OPTIONS,
    });

    await scheduler.fireNext();
    await expect(waiting).resolves.toEqual({ isValid: false });
  });

  it('ignores samples that are still too coarse and keeps waiting', async () => {
    const clock = createFakeClock(1_000);
    const scheduler = createFakeScheduler();
    const listeners: Array<(sample: LocationSample) => void> = [];

    const waiting = waitForFreshSample({
      getLatest: () => null,
      subscribe: (next) => {
        listeners.push(next);
        return () => undefined;
      },
      clock,
      scheduler,
      waitTimeoutMs: ACCEPT_LOCATION_WAIT_TIMEOUT_MS,
      options: OPTIONS,
    });

    listeners[0]?.({
      latitude: 52.1,
      longitude: 5.1,
      accuracyMeters: ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
      readAt: 1_000,
    });
    expect(scheduler.pending()).toHaveLength(1);

    listeners[0]?.({
      latitude: 52.3,
      longitude: 5.3,
      accuracyMeters: 40,
      readAt: 1_000,
    });
    await expect(waiting).resolves.toEqual({ isValid: true, latitude: 52.3, longitude: 5.3 });
  });
});
