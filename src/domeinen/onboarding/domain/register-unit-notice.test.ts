import { afterEach, describe, expect, it } from 'vitest';
import { claimRegisterUnitNotice, clearRegisterUnitNotice } from './register-unit-notice';

describe('claimRegisterUnitNotice', () => {
  afterEach(() => {
    clearRegisterUnitNotice();
  });

  it('allows the registration prompt once until cleared', () => {
    expect(claimRegisterUnitNotice()).toBe(true);
    expect(claimRegisterUnitNotice()).toBe(false);

    clearRegisterUnitNotice();

    expect(claimRegisterUnitNotice()).toBe(true);
  });
});
