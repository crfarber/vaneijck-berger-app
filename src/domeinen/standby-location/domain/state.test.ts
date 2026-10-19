import { describe, expect, it } from 'vitest';
import { applyAdvice, clearAdvice, emptyStandbyState, expireAdvice } from './state';
import type { StandbyLocationAdvice } from './types';

const advice: StandbyLocationAdvice = {
  standbyLocationId: '1',
  latitude: 52,
  longitude: 5,
  receivedAt: '2026-10-19T10:00:00.000Z',
};

describe('standby state machine', () => {
  it('applies as active when nothing blocks', () => {
    expect(applyAdvice(emptyStandbyState(), advice, false)).toEqual({
      pendingAdvice: advice,
      status: 'active',
    });
  });

  it('applies as expired when the overview already has work', () => {
    expect(applyAdvice(emptyStandbyState(), advice, true)).toEqual({
      pendingAdvice: advice,
      status: 'expired',
    });
  });

  it('expires only from active', () => {
    const active = { ...emptyStandbyState(), pendingAdvice: advice, status: 'active' as const };
    expect(expireAdvice(active)).toEqual({ pendingAdvice: advice, status: 'expired' });
    expect(expireAdvice({ ...active, status: 'expired' })).toBeNull();
    expect(expireAdvice(emptyStandbyState())).toBeNull();
  });

  it('clears advice and status', () => {
    expect(clearAdvice()).toEqual({ pendingAdvice: null, status: null });
  });
});
