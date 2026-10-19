import type { StandbyAdviceStatus, StandbyLocationAdvice, StandbyLocationState } from './types';

export const emptyStandbyState = (): StandbyLocationState => ({
  pendingAdvice: null,
  status: null,
  hydrated: false,
});

/**
 * Accepts a new advice. Status becomes `expired` immediately when the overview already has
 * blocking work; otherwise `active`.
 */
export function applyAdvice(
  _current: StandbyLocationState,
  advice: StandbyLocationAdvice,
  hasBlockingItems: boolean,
): Pick<StandbyLocationState, 'pendingAdvice' | 'status'> {
  return {
    pendingAdvice: advice,
    status: hasBlockingItems ? 'expired' : 'active',
  };
}

/** Active → expired; keeps the advice so a later dissolve does not revive it. */
export function expireAdvice(
  current: StandbyLocationState,
): Pick<StandbyLocationState, 'pendingAdvice' | 'status'> | null {
  if (current.status !== 'active' || current.pendingAdvice === null) {
    return null;
  }
  const status: StandbyAdviceStatus = 'expired';
  return { pendingAdvice: current.pendingAdvice, status };
}

export function clearAdvice(): Pick<StandbyLocationState, 'pendingAdvice' | 'status'> {
  return { pendingAdvice: null, status: null };
}
