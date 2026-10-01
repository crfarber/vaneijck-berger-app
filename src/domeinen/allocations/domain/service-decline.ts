import { SERVICE_STATUS } from '@/domeinen/services';

/** The two ways a berger can decline a single service from the processing form. */
export const SERVICE_DECLINE_ACTION = {
  futileRide: 'futileRide',
  returnToDispatch: 'returnToDispatch',
} as const;

export type ServiceDeclineAction =
  (typeof SERVICE_DECLINE_ACTION)[keyof typeof SERVICE_DECLINE_ACTION];

export const SERVICE_DECLINE_STATUS: Record<ServiceDeclineAction, number> = {
  futileRide: SERVICE_STATUS.VERGEEFSE_RIT,
  returnToDispatch: SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP,
};

export type ServiceDeclineStep =
  | { step: 'closed' }
  | { step: 'choose' }
  | { step: 'confirm'; action: ServiceDeclineAction }
  | { step: 'submitting'; action: ServiceDeclineAction };

export type ServiceDeclineEvent =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'select'; action: ServiceDeclineAction }
  | { type: 'back' }
  | { type: 'confirm' }
  | { type: 'done' }
  | { type: 'fail' };

/**
 * Sheet steps for declining a service. Selecting an action never submits — the berger must
 * confirm first. That is deliberate: the old app fired on the first tap (bekende-fouten).
 */
export function reduceServiceDecline(
  state: ServiceDeclineStep,
  event: ServiceDeclineEvent,
): ServiceDeclineStep {
  switch (event.type) {
    case 'open':
      return { step: 'choose' };
    case 'close':
      return { step: 'closed' };
    case 'select':
      if (state.step !== 'choose') {
        return state;
      }
      return { step: 'confirm', action: event.action };
    case 'back':
      if (state.step === 'confirm') {
        return { step: 'choose' };
      }
      return { step: 'closed' };
    case 'confirm':
      if (state.step !== 'confirm') {
        return state;
      }
      return { step: 'submitting', action: state.action };
    case 'done':
    case 'fail':
      if (state.step !== 'submitting') {
        return state;
      }
      return event.type === 'done' ? { step: 'closed' } : { step: 'confirm', action: state.action };
  }
}

export function statuscodeForDeclineAction(action: ServiceDeclineAction): number {
  return SERVICE_DECLINE_STATUS[action];
}
