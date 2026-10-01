import { describe, expect, it } from 'vitest';
import { DISPATCH_PHONE_NUMBER, dispatchPhoneUrl } from './dispatch';

describe('dispatchPhoneUrl', () => {
  it('uses the national number without a leading plus (old app dialled +0850…)', () => {
    expect(dispatchPhoneUrl()).toBe(`tel:${DISPATCH_PHONE_NUMBER}`);
    expect(dispatchPhoneUrl()).not.toContain('+');
    expect(dispatchPhoneUrl()).toBe('tel:0850206700');
  });
});
