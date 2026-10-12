import { describe, expect, it } from 'vitest';
import { decideChangeVehicle } from './change-vehicle';

describe('decideChangeVehicle', () => {
  it('offers to call dispatch when there is no unit and active work blocks registration', () => {
    expect(decideChangeVehicle({ kind: 'blocked', reason: 'no-unit' })).toEqual({
      action: 'call-dispatch',
    });
  });

  it('asks to finish work first when the vehicle is missing amid active work', () => {
    expect(decideChangeVehicle({ kind: 'blocked', reason: 'no-vehicle' })).toEqual({
      action: 'alert',
      reason: 'no-vehicle',
    });
  });

  it('asks for confirmation when registration is required for a missing unit or vehicle', () => {
    expect(decideChangeVehicle({ kind: 'required', reason: 'no-unit' })).toEqual({
      action: 'confirm-then-register',
      reason: 'no-unit',
    });
    expect(decideChangeVehicle({ kind: 'required', reason: 'no-vehicle' })).toEqual({
      action: 'confirm-then-register',
      reason: 'no-vehicle',
    });
  });

  it('opens the end-time screen when only the shift expired', () => {
    expect(decideChangeVehicle({ kind: 'required', reason: 'expired' })).toEqual({
      action: 'extend-shift',
    });
  });

  it('opens the current-unit overview when a change is not required', () => {
    expect(decideChangeVehicle({ kind: 'not-needed' })).toEqual({
      action: 'open-overview',
    });
  });
});
