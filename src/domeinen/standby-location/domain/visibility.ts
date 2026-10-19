import type { StandbyAdviceStatus, StandbyLocationAdvice } from './types';

/** Banner is shown only for an active advice while nothing blocks the overview. */
export function isStandbyBannerVisible(input: {
  readonly status: StandbyAdviceStatus | null;
  readonly pendingAdvice: StandbyLocationAdvice | null;
  readonly hasBlockingItems: boolean;
}): boolean {
  return input.status === 'active' && input.pendingAdvice !== null && !input.hasBlockingItems;
}
