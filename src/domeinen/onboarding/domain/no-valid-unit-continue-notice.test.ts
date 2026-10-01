import { afterEach, describe, expect, it } from 'vitest';
import {
  claimNoValidUnitContinueNotice,
  clearNoValidUnitContinueNotice,
} from './no-valid-unit-continue-notice';

describe('claimNoValidUnitContinueNotice', () => {
  afterEach(() => {
    clearNoValidUnitContinueNotice();
  });

  it('allows the notice once until cleared', () => {
    expect(claimNoValidUnitContinueNotice()).toBe(true);
    expect(claimNoValidUnitContinueNotice()).toBe(false);
    expect(claimNoValidUnitContinueNotice()).toBe(false);

    clearNoValidUnitContinueNotice();

    expect(claimNoValidUnitContinueNotice()).toBe(true);
    expect(claimNoValidUnitContinueNotice()).toBe(false);
  });
});
