import { describe, expect, it } from 'vitest';
import {
  matchLastUnitSnapshot,
  parseLastUnitSnapshot,
  toUnitReuseIntent,
  type LastUnitSnapshot,
} from './last-unit-snapshot';

const external: LastUnitSnapshot = {
  kind: 'external',
  workerId: 'w1',
  userType: 'external',
  plate: 'AB12CD',
};

const internal: LastUnitSnapshot = {
  kind: 'internal',
  workerId: 'w1',
  userType: 'internal',
  truckId: 'truck-1',
  trailerId: 'trailer-1',
  vehicleName: '12-ABC-3',
  vehicleNumber: 'T-1',
  trailerName: 'Aanhanger 1',
  trailerNumber: 'A-1',
};

describe('parseLastUnitSnapshot', () => {
  it('returns null for empty storage', () => {
    expect(parseLastUnitSnapshot(null)).toBeNull();
    expect(parseLastUnitSnapshot('')).toBeNull();
    expect(parseLastUnitSnapshot('  ')).toBeNull();
  });

  it('parses a valid external snapshot', () => {
    expect(parseLastUnitSnapshot(JSON.stringify(external))).toEqual(external);
  });

  it('parses a valid internal snapshot', () => {
    expect(parseLastUnitSnapshot(JSON.stringify(internal))).toEqual(internal);
  });

  it('rejects invalid JSON and shapes', () => {
    expect(parseLastUnitSnapshot('{')).toBeNull();
    expect(parseLastUnitSnapshot(JSON.stringify({ kind: 'external' }))).toBeNull();
    expect(
      parseLastUnitSnapshot(
        JSON.stringify({ ...external, userType: 'internal', kind: 'external' }),
      ),
    ).toBeNull();
  });
});

describe('matchLastUnitSnapshot', () => {
  it('returns the snapshot for the same worker and user type', () => {
    expect(matchLastUnitSnapshot(external, { workerId: 'w1', userType: 'external' })).toEqual(
      external,
    );
  });

  it('rejects a different worker or user type', () => {
    expect(matchLastUnitSnapshot(external, { workerId: 'w2', userType: 'external' })).toBeNull();
    expect(matchLastUnitSnapshot(external, { workerId: 'w1', userType: 'internal' })).toBeNull();
  });

  it('rejects an internal truck that left the fleet', () => {
    expect(
      matchLastUnitSnapshot(internal, {
        workerId: 'w1',
        userType: 'internal',
        fleetTruckIds: new Set(['other']),
      }),
    ).toBeNull();
  });

  it('accepts an internal truck still in the fleet', () => {
    expect(
      matchLastUnitSnapshot(internal, {
        workerId: 'w1',
        userType: 'internal',
        fleetTruckIds: new Set(['truck-1']),
      }),
    ).toEqual(internal);
  });
});

describe('toUnitReuseIntent', () => {
  it('maps external and internal snapshots', () => {
    expect(toUnitReuseIntent(external)).toEqual({ kind: 'external', plate: 'AB12CD' });
    expect(toUnitReuseIntent(internal)).toEqual({
      kind: 'internal',
      truckId: 'truck-1',
      trailerId: 'trailer-1',
    });
  });
});
