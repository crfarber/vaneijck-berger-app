import { describe, expect, it } from 'vitest';
import { decideReregister, type CurrentUnitForReregister } from './reregister';

const NOW = Date.UTC(2026, 8, 22, 12, 0, 0);
const inFuture = NOW + 3_600_000;
const inPast = NOW - 3_600_000;

describe('decideReregister', () => {
  it('requires registration when there is no unit at all', () => {
    expect(decideReregister(null, { hasActiveAllocations: false, now: NOW })).toEqual({
      kind: 'required',
      reason: 'no-unit',
    });
  });

  it('blocks instead of requiring when active allocations exist and there is no unit', () => {
    expect(decideReregister(null, { hasActiveAllocations: true, now: NOW })).toEqual({
      kind: 'blocked',
      reason: 'no-unit',
    });
  });

  it('requires registration when the unit has no vehicle', () => {
    const unit: CurrentUnitForReregister = { hasVehicle: false, validUntil: inFuture };
    expect(decideReregister(unit, { hasActiveAllocations: false, now: NOW })).toEqual({
      kind: 'required',
      reason: 'no-vehicle',
    });
  });

  it('blocks instead of requiring when active allocations exist and the vehicle is missing', () => {
    const unit: CurrentUnitForReregister = { hasVehicle: false, validUntil: inFuture };
    expect(decideReregister(unit, { hasActiveAllocations: true, now: NOW })).toEqual({
      kind: 'blocked',
      reason: 'no-vehicle',
    });
  });

  it('requires registration when the shift expired and there is no active work', () => {
    const unit: CurrentUnitForReregister = { hasVehicle: true, validUntil: inPast };
    expect(decideReregister(unit, { hasActiveAllocations: false, now: NOW })).toEqual({
      kind: 'required',
      reason: 'expired',
    });
  });

  it('treats a never-set validUntil as expired', () => {
    const unit: CurrentUnitForReregister = { hasVehicle: true, validUntil: null };
    expect(decideReregister(unit, { hasActiveAllocations: false, now: NOW })).toEqual({
      kind: 'required',
      reason: 'expired',
    });
  });

  it('needs nothing when the shift expired but there is active work (matches the old app exactly)', () => {
    const unit: CurrentUnitForReregister = { hasVehicle: true, validUntil: inPast };
    expect(decideReregister(unit, { hasActiveAllocations: true, now: NOW })).toEqual({
      kind: 'not-needed',
      expiredWithActiveWork: true,
    });
  });

  it('needs nothing when the unit has a vehicle and is still valid', () => {
    const unit: CurrentUnitForReregister = { hasVehicle: true, validUntil: inFuture };
    expect(decideReregister(unit, { hasActiveAllocations: false, now: NOW })).toEqual({
      kind: 'not-needed',
    });
  });
});
