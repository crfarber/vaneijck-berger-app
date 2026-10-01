import { describe, expect, it } from 'vitest';
import {
  classifyInternalAuthError,
  describeInternalFailure,
  describeLoginFailure,
  describeSmsFailure,
} from './login-failures';

describe('describeSmsFailure', () => {
  it.each([
    [{ kind: 'code-still-valid' as const }, 'login.errors.codeStillValid'],
    [{ kind: 'phone-not-registered' as const }, 'login.errors.phoneNotRegistered'],
    [{ kind: 'network' as const }, 'common.offline'],
    [{ kind: 'unknown' as const }, 'login.errors.unknown'],
  ])('maps %j to %s', (failure, key) => {
    expect(describeSmsFailure(failure)).toEqual({ key });
  });

  it('keeps the reason the backend gave', () => {
    expect(describeSmsFailure({ kind: 'rejected', detail: 'Number is blocked' })).toEqual({
      key: 'login.errors.unknown',
      detail: 'Number is blocked',
    });
  });
});

describe('describeLoginFailure', () => {
  it('names a wrong code', () => {
    expect(describeLoginFailure({ kind: 'invalid-code' })).toEqual({
      key: 'login.errors.invalidCode',
    });
  });

  it('names a missing connection', () => {
    expect(describeLoginFailure({ kind: 'network' })).toEqual({ key: 'common.offline' });
  });

  it('keeps the description of a refusal', () => {
    expect(describeLoginFailure({ kind: 'rejected', detail: 'Too many attempts' })).toEqual({
      key: 'login.errors.unknown',
      detail: 'Too many attempts',
    });
    expect(describeLoginFailure({ kind: 'unknown' })).toEqual({ key: 'login.errors.unknown' });
  });
});

describe('describeInternalFailure', () => {
  it('says nothing when the user cancelled', () => {
    expect(describeInternalFailure({ kind: 'cancelled' })).toBeNull();
  });

  it('explains that the account login is unavailable', () => {
    expect(describeInternalFailure({ kind: 'unavailable' })).toBe('login.internalUnavailable');
  });

  it('reports a failure', () => {
    expect(describeInternalFailure({ kind: 'failed' })).toBe('login.errors.unknown');
  });
});

describe('classifyInternalAuthError', () => {
  it('treats a declined consent as a cancel', () => {
    expect(classifyInternalAuthError({ code: 'access_denied' })).toEqual({ kind: 'cancelled' });
  });

  it("treats AppAuth-Android's stable cancel code as a cancel", () => {
    expect(classifyInternalAuthError({ code: 'user_cancelled_authorization' })).toEqual({
      kind: 'cancelled',
    });
  });

  it('treats the iOS generic fallback as a cancel, whatever the message says (confirmed on a device: declining the system prompt gives this code with a message that does not mention "cancel")', () => {
    expect(
      classifyInternalAuthError({
        code: 'authentication_failed',
        message: "The operation couldn't be completed.",
      }),
    ).toEqual({ kind: 'cancelled' });
    expect(classifyInternalAuthError({ code: 'authentication_failed' })).toEqual({
      kind: 'cancelled',
    });
  });

  it('treats the Android onActivityResult fallback as a cancel, for the same reason', () => {
    expect(classifyInternalAuthError({ code: 'authentication_error', message: 'boom' })).toEqual({
      kind: 'cancelled',
    });
    expect(classifyInternalAuthError({ code: 'authentication_error' })).toEqual({
      kind: 'cancelled',
    });
  });

  it('treats an unknown code as a failure', () => {
    expect(classifyInternalAuthError({ code: 'server_error', message: 'boom' })).toEqual({
      kind: 'failed',
    });
  });

  it('treats a plain error with no code as a failure', () => {
    expect(classifyInternalAuthError({})).toEqual({ kind: 'failed' });
  });
});
