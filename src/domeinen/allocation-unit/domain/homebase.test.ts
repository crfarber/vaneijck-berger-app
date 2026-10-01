import { describe, expect, it } from 'vitest';
import {
  formatHomebaseAddress,
  normalizeHomebaseCoordinate,
  pickInitialHomebase,
  searchHomebaseLocations,
  sortHomebaseLocations,
  type HomebaseLocation,
} from './homebase';

function location(overrides: Partial<HomebaseLocation> & { id: string }): HomebaseLocation {
  return {
    name: overrides.id,
    street: null,
    houseNumber: null,
    houseNumberAddition: null,
    postalCode: null,
    city: null,
    coordinate: null,
    ...overrides,
  };
}

const utrecht = location({
  id: 'utrecht',
  name: 'Van Eijck Utrecht',
  street: 'Stationsplein',
  houseNumber: '1',
  houseNumberAddition: 'A',
  postalCode: '3511 ED',
  city: 'Utrecht',
  coordinate: { latitude: 52.089, longitude: 5.11 },
});
const amsterdam = location({
  id: 'amsterdam',
  name: 'Van Eijck Amsterdam',
  city: 'Amsterdam',
  coordinate: { latitude: 52.379, longitude: 4.9 },
});
const breda = location({ id: 'breda', name: 'Van Eijck Breda', city: 'Breda' });

const nearUtrecht = { latitude: 52.09, longitude: 5.12 };

describe('normalizeHomebaseCoordinate', () => {
  it('keeps a correct NL coordinate', () => {
    expect(normalizeHomebaseCoordinate(52.1, 5.1)).toEqual({ latitude: 52.1, longitude: 5.1 });
  });

  it('swaps latitude and longitude that the CRM stored the wrong way round', () => {
    expect(normalizeHomebaseCoordinate(5.1, 52.1)).toEqual({ latitude: 52.1, longitude: 5.1 });
  });

  it('accepts numeric text', () => {
    expect(normalizeHomebaseCoordinate('52.1', '5.1')).toEqual({ latitude: 52.1, longitude: 5.1 });
  });

  it('returns null for a missing or empty coordinate', () => {
    expect(normalizeHomebaseCoordinate(null, 5.1)).toBeNull();
    expect(normalizeHomebaseCoordinate(0, 0)).toBeNull();
  });
});

describe('formatHomebaseAddress', () => {
  it('builds street, number, addition, postal code and city', () => {
    expect(formatHomebaseAddress(utrecht)).toBe('Stationsplein 1A, 3511 ED Utrecht');
  });

  it('leaves out missing parts', () => {
    expect(formatHomebaseAddress(amsterdam)).toBe('Amsterdam');
    expect(formatHomebaseAddress(location({ id: 'empty' }))).toBe('');
  });
});

describe('sortHomebaseLocations', () => {
  it('sorts nearest first and marks only the nearest', () => {
    const sorted = sortHomebaseLocations([amsterdam, breda, utrecht], nearUtrecht);

    expect(sorted.map((entry) => entry.location.id)).toEqual(['utrecht', 'amsterdam', 'breda']);
    expect(sorted.map((entry) => entry.isNearest)).toEqual([true, false, false]);
    expect(sorted[0]?.distanceMeters).toBeLessThan(1000);
    expect(sorted[2]?.distanceMeters).toBeNull();
  });

  it('sorts locations without a coordinate by name at the end', () => {
    const zwolle = location({ id: 'zwolle', name: 'Zwolle' });
    const almere = location({ id: 'almere', name: 'Almere' });

    const sorted = sortHomebaseLocations([zwolle, utrecht, almere], nearUtrecht);

    expect(sorted.map((entry) => entry.location.id)).toEqual(['utrecht', 'almere', 'zwolle']);
  });

  it('breaks an equal distance by name', () => {
    const twin = location({ id: 'twin', name: 'Aaa', coordinate: utrecht.coordinate });

    const sorted = sortHomebaseLocations([utrecht, twin], nearUtrecht);

    expect(sorted.map((entry) => entry.location.id)).toEqual(['twin', 'utrecht']);
  });

  it('sorts alphabetically without a nearest badge when there is no position', () => {
    const sorted = sortHomebaseLocations([utrecht, breda, amsterdam], null);

    expect(sorted.map((entry) => entry.location.id)).toEqual(['amsterdam', 'breda', 'utrecht']);
    expect(sorted.every((entry) => !entry.isNearest && entry.distanceMeters === null)).toBe(true);
  });

  it('has no nearest when no location has a coordinate', () => {
    const sorted = sortHomebaseLocations([breda], nearUtrecht);

    expect(sorted[0]?.isNearest).toBe(false);
  });
});

describe('searchHomebaseLocations', () => {
  const sorted = sortHomebaseLocations([amsterdam, breda, utrecht], nearUtrecht);
  const ids = (query: string) =>
    searchHomebaseLocations(sorted, query).map((entry) => entry.location.id);

  it('returns everything for an empty query', () => {
    expect(ids('  ')).toEqual(['utrecht', 'amsterdam', 'breda']);
  });

  it('matches the name case-insensitively and keeps the distance order', () => {
    expect(ids('VAN EIJCK')).toEqual(['utrecht', 'amsterdam', 'breda']);
    expect(ids('breda')).toEqual(['breda']);
  });

  it('matches street, postal code, city and the formatted address', () => {
    expect(ids('stationsplein')).toEqual(['utrecht']);
    expect(ids('3511 ed')).toEqual(['utrecht']);
    expect(ids('amsterdam')).toEqual(['amsterdam']);
    expect(ids('plein 1a')).toEqual(['utrecht']);
  });

  it('returns nothing when nothing matches', () => {
    expect(ids('rotterdam')).toEqual([]);
  });
});

describe('pickInitialHomebase', () => {
  const sorted = sortHomebaseLocations([amsterdam, breda, utrecht], nearUtrecht);

  it('prefers the remembered location', () => {
    expect(pickInitialHomebase(sorted, 'breda')).toBe(breda);
  });

  it('falls back to the nearest when the remembered location is no longer synced', () => {
    expect(pickInitialHomebase(sorted, 'gone')).toBe(utrecht);
  });

  it('picks the nearest when nothing is remembered', () => {
    expect(pickInitialHomebase(sorted, null)).toBe(utrecht);
  });

  it('picks nothing without a position and without a remembered location', () => {
    expect(pickInitialHomebase(sortHomebaseLocations([utrecht], null), null)).toBeNull();
  });
});
