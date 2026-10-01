import { describe, expect, it } from 'vitest';
import { distanceInMeters, toCoordinate } from './geo';

const utrecht = { latitude: 52.0907, longitude: 5.1214 };
const amsterdam = { latitude: 52.3676, longitude: 4.9041 };

describe('distanceInMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceInMeters(utrecht, utrecht)).toBe(0);
  });

  it('measures Utrecht to Amsterdam at about 34.5 kilometers', () => {
    const distance = distanceInMeters(utrecht, amsterdam);
    expect(distance).toBeGreaterThan(34_000);
    expect(distance).toBeLessThan(35_000);
  });

  it('is the same in both directions', () => {
    expect(distanceInMeters(utrecht, amsterdam)).toBeCloseTo(
      distanceInMeters(amsterdam, utrecht),
      6,
    );
  });

  it('measures one degree of latitude at about 111 kilometers', () => {
    const distance = distanceInMeters(
      { latitude: 52, longitude: 5 },
      { latitude: 53, longitude: 5 },
    );
    expect(distance).toBeGreaterThan(111_000);
    expect(distance).toBeLessThan(111_400);
  });

  it('resolves small distances: 0.001 degrees of latitude is about 111 meters', () => {
    const distance = distanceInMeters(
      { latitude: 52, longitude: 5 },
      { latitude: 52.001, longitude: 5 },
    );
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });

  it('handles points on both sides of the date line', () => {
    const distance = distanceInMeters(
      { latitude: 0, longitude: 179.5 },
      { latitude: 0, longitude: -179.5 },
    );
    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_000);
  });

  it('handles antipodes without producing NaN', () => {
    const distance = distanceInMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 180 },
    );
    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThan(20_000_000);
  });
});

describe('toCoordinate', () => {
  it('accepts numbers and numeric text', () => {
    expect(toCoordinate(52.09, 5.12)).toEqual({ latitude: 52.09, longitude: 5.12 });
    expect(toCoordinate('52.09', ' 5.12 ')).toEqual({ latitude: 52.09, longitude: 5.12 });
  });

  it.each([
    ['a missing latitude', undefined, 5.1],
    ['a missing longitude', 52.1, null],
    ['empty text', '', ''],
    ['text that is not a number', 'abc', '5'],
    ['NaN', Number.NaN, 5],
    ['Infinity', 52, Number.POSITIVE_INFINITY],
    ['a latitude off the globe', 91, 5],
    ['a longitude off the globe', 52, 181],
    ['(0, 0)', 0, 0],
    ['(0, 0) as text', '0', '0'],
  ])('rejects %s', (_name, latitude, longitude) => {
    expect(toCoordinate(latitude, longitude)).toBeNull();
  });

  it('accepts a real coordinate where one part happens to be zero', () => {
    expect(toCoordinate(0, 5)).toEqual({ latitude: 0, longitude: 5 });
    expect(toCoordinate(52.1, 0)).toEqual({ latitude: 52.1, longitude: 0 });
  });

  it('rejects a position when either part is missing (the old app accepted one usable part)', () => {
    expect(toCoordinate(52.1, undefined)).toBeNull();
    expect(toCoordinate(null, 5.1)).toBeNull();
  });
});
