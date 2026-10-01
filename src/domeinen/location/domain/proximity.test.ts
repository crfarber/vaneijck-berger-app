import { describe, expect, it } from 'vitest';
import { decideProximity, PROXIMITY_THRESHOLD_METERS, resolveCurrentPosition } from './proximity';

const here = { latitude: 52.09, longitude: 5.12 };
/** About 0.00449 degrees of latitude is 500 meters. */
const north = (meters: number) => ({
  latitude: here.latitude + meters / 111_195,
  longitude: here.longitude,
});

describe('resolveCurrentPosition', () => {
  it('returns the position of a valid location', () => {
    expect(resolveCurrentPosition({ isValid: true, latitude: 52.09, longitude: 5.12 })).toEqual(
      here,
    );
  });

  it.each([
    ['no location', null],
    ['an invalid location', { isValid: false, latitude: 52.09, longitude: 5.12 }],
    ['a valid flag without coordinates', { isValid: true }],
    ['zero coordinates', { isValid: true, latitude: 0, longitude: 0 }],
  ])('returns null for %s', (_name, location) => {
    expect(resolveCurrentPosition(location)).toBeNull();
  });
});

describe('decideProximity', () => {
  it('needs no confirmation when the berger is close', () => {
    expect(decideProximity(here, north(100))).toEqual({ action: 'proceed' });
    expect(decideProximity(here, here)).toEqual({ action: 'proceed' });
  });

  it('needs no confirmation just inside the threshold', () => {
    expect(decideProximity(here, north(PROXIMITY_THRESHOLD_METERS - 5))).toEqual({
      action: 'proceed',
    });
  });

  it('needs confirmation from the threshold onwards', () => {
    const decision = decideProximity(here, north(PROXIMITY_THRESHOLD_METERS + 5));
    expect(decision).toMatchObject({ action: 'confirm', reason: 'too-far' });
  });

  it('reports how far away the berger is', () => {
    const decision = decideProximity(here, north(2_000));
    expect(decision.action).toBe('confirm');
    if (decision.action === 'confirm') {
      expect(decision.distanceMeters).toBeGreaterThan(1_990);
      expect(decision.distanceMeters).toBeLessThan(2_010);
    }
  });

  it('needs confirmation when the position of the berger is unknown', () => {
    expect(decideProximity(null, here)).toEqual({
      action: 'confirm',
      reason: 'no-current-location',
    });
  });

  it('needs confirmation when the destination is unknown', () => {
    expect(decideProximity(here, null)).toEqual({
      action: 'confirm',
      reason: 'no-target-location',
    });
  });

  it('asks about the position of the berger first when both are unknown', () => {
    expect(decideProximity(null, null)).toEqual({
      action: 'confirm',
      reason: 'no-current-location',
    });
  });
});
