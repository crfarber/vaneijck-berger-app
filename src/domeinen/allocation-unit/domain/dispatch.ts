/** Default dispatch phone number (Call Dispatch). Shown when a berger has active work but no unit. */
export const DISPATCH_PHONE_NUMBER = '0850206700';

/**
 * `tel:` URL for the fixed dispatch number. The old app dialled `tel:+0850206700` /
 * `telprompt:+0850206700` (a `+` in front of a national number that already starts with 0) —
 * that is wrong; keep the national form without a leading plus.
 */
export function dispatchPhoneUrl(): string {
  return `tel:${DISPATCH_PHONE_NUMBER}`;
}
