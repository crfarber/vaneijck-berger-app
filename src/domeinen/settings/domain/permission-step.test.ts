import { describe, expect, it } from 'vitest';
import {
  nextPermissionStep,
  NOTIFICATION_AUTHORIZATION,
  notificationPermissionSnapshot,
  PERMISSION_STATUS,
} from './permission-step';

describe('nextPermissionStep', () => {
  it('leaves a granted permission alone', () => {
    expect(nextPermissionStep({ status: PERMISSION_STATUS.granted, canAskAgain: false })).toBe(
      'ready',
    );
  });

  it('asks when the system has not been asked yet', () => {
    expect(nextPermissionStep({ status: PERMISSION_STATUS.undetermined, canAskAgain: true })).toBe(
      'ask',
    );
  });

  it('asks again when a refusal can still show the dialog', () => {
    expect(nextPermissionStep({ status: PERMISSION_STATUS.denied, canAskAgain: true })).toBe('ask');
  });

  it('sends the berger to the system settings when the dialog will not appear again', () => {
    expect(nextPermissionStep({ status: PERMISSION_STATUS.denied, canAskAgain: false })).toBe(
      'open-settings',
    );
  });
});

describe('notificationPermissionSnapshot', () => {
  it('treats an authorized or provisional grant as granted on both platforms', () => {
    for (const platform of ['android', 'ios'] as const) {
      for (const authorization of [
        NOTIFICATION_AUTHORIZATION.authorized,
        NOTIFICATION_AUTHORIZATION.provisional,
      ]) {
        expect(
          notificationPermissionSnapshot({ authorization, platform, afterRequest: false }),
        ).toEqual({ status: PERMISSION_STATUS.granted, canAskAgain: false });
      }
    }
  });

  it('asks on iOS when the berger has not been asked yet', () => {
    expect(
      notificationPermissionSnapshot({
        authorization: NOTIFICATION_AUTHORIZATION.notDetermined,
        platform: 'ios',
        afterRequest: false,
      }),
    ).toEqual({ status: PERMISSION_STATUS.undetermined, canAskAgain: true });
  });

  it('sends the berger to the system settings after a refusal on iOS', () => {
    expect(
      nextPermissionStep(
        notificationPermissionSnapshot({
          authorization: NOTIFICATION_AUTHORIZATION.denied,
          platform: 'ios',
          afterRequest: false,
        }),
      ),
    ).toBe('open-settings');
  });

  // Regression: Android never reports "not asked yet", so a fresh install looked blocked and the
  // wizard showed "Permission blocked" without ever showing the system dialog.
  it('still asks on Android when notifications are off but the dialog was never tried', () => {
    expect(
      nextPermissionStep(
        notificationPermissionSnapshot({
          authorization: NOTIFICATION_AUTHORIZATION.denied,
          platform: 'android',
          afterRequest: false,
        }),
      ),
    ).toBe('ask');
  });

  it('sends the berger to the system settings when Android still refuses after a request', () => {
    expect(
      nextPermissionStep(
        notificationPermissionSnapshot({
          authorization: NOTIFICATION_AUTHORIZATION.denied,
          platform: 'android',
          afterRequest: true,
        }),
      ),
    ).toBe('open-settings');
  });
});
