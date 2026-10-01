import { describe, expect, it } from 'vitest';
import { decideChangeVehicle } from './change-vehicle';

describe('decideChangeVehicle', () => {
  it('offers to call dispatch when there is no unit and active work blocks registration', () => {
    expect(decideChangeVehicle({ kind: 'blocked', reason: 'no-unit' }, true)).toEqual({
      action: 'call-dispatch',
    });
  });

  it('asks to finish work first when the vehicle is missing amid active work', () => {
    expect(decideChangeVehicle({ kind: 'blocked', reason: 'no-vehicle' }, true)).toEqual({
      action: 'alert',
      reason: 'no-vehicle',
    });
  });

  it('asks for confirmation when registration is required for a missing unit or vehicle', () => {
    expect(decideChangeVehicle({ kind: 'required', reason: 'no-unit' }, false)).toEqual({
      action: 'confirm-then-register',
      reason: 'no-unit',
    });
    expect(decideChangeVehicle({ kind: 'required', reason: 'no-vehicle' }, false)).toEqual({
      action: 'confirm-then-register',
      reason: 'no-vehicle',
    });
  });

  it('opens the end-time screen when only the shift expired', () => {
    expect(decideChangeVehicle({ kind: 'required', reason: 'expired' }, false)).toEqual({
      action: 'extend-shift',
    });
  });

  it('opens registration when a change is not required and nothing is in progress', () => {
    expect(decideChangeVehicle({ kind: 'not-needed' }, false)).toEqual({
      action: 'register',
    });
  });

  it('warns instead of opening registration while an allocation is in progress', () => {
    expect(decideChangeVehicle({ kind: 'not-needed' }, true)).toEqual({
      action: 'alert',
      reason: 'active-work',
    });
  });
});
