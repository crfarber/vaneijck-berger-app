import { describe, expect, it } from 'vitest';
import { planRegistration } from './registration';

describe('planRegistration', () => {
  it('registers a token once permission is granted', () => {
    expect(planRegistration({ permission: 'granted', token: 'ExponentPushToken[abc]' })).toEqual({
      action: 'register',
      token: 'ExponentPushToken[abc]',
    });
  });

  it('does not register when permission is denied', () => {
    expect(planRegistration({ permission: 'denied', token: 'ExponentPushToken[abc]' })).toEqual({
      action: 'skip',
      reason: 'denied',
    });
  });

  it('does not register without a token, including a blank one', () => {
    expect(planRegistration({ permission: 'granted', token: null })).toEqual({
      action: 'skip',
      reason: 'no-token',
    });
    expect(planRegistration({ permission: 'granted', token: '   ' })).toEqual({
      action: 'skip',
      reason: 'no-token',
    });
  });
});
