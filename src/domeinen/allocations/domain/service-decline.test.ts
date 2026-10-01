import { describe, expect, it } from 'vitest';
import {
  reduceServiceDecline,
  SERVICE_DECLINE_ACTION,
  statuscodeForDeclineAction,
  type ServiceDeclineStep,
} from './service-decline';

describe('reduceServiceDecline', () => {
  const closed: ServiceDeclineStep = { step: 'closed' };

  it('opens on the choose step', () => {
    expect(reduceServiceDecline(closed, { type: 'open' })).toEqual({ step: 'choose' });
  });

  it('moves to confirm on select, without submitting', () => {
    const afterSelect = reduceServiceDecline(
      { step: 'choose' },
      { type: 'select', action: SERVICE_DECLINE_ACTION.futileRide },
    );
    expect(afterSelect).toEqual({
      step: 'confirm',
      action: SERVICE_DECLINE_ACTION.futileRide,
    });
    expect(afterSelect.step).not.toBe('submitting');
  });

  it('only reaches submitting after an explicit confirm', () => {
    const confirming = reduceServiceDecline(
      { step: 'choose' },
      { type: 'select', action: SERVICE_DECLINE_ACTION.returnToDispatch },
    );
    expect(reduceServiceDecline(confirming, { type: 'confirm' })).toEqual({
      step: 'submitting',
      action: SERVICE_DECLINE_ACTION.returnToDispatch,
    });
  });

  it('goes back from confirm to choose', () => {
    expect(
      reduceServiceDecline(
        { step: 'confirm', action: SERVICE_DECLINE_ACTION.futileRide },
        { type: 'back' },
      ),
    ).toEqual({ step: 'choose' });
  });

  it('maps each action to the CRM status code', () => {
    expect(statuscodeForDeclineAction(SERVICE_DECLINE_ACTION.futileRide)).toBe(875920006);
    expect(statuscodeForDeclineAction(SERVICE_DECLINE_ACTION.returnToDispatch)).toBe(1);
  });
});
