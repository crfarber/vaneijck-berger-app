import { describe, expect, it } from 'vitest';
import { nextPermissionStep, PERMISSION_STATUS } from './permission-step';

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
