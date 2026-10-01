/** The ways signing in can fail in an expected manner, and the text that belongs to each. */

export type SmsRequestFailure =
  /** A code was sent recently and is still valid: carry on to the code screen. */
  | { kind: 'code-still-valid' }
  | { kind: 'phone-not-registered' }
  | { kind: 'rejected'; detail: string }
  | { kind: 'network' }
  | { kind: 'unknown' };

export type LoginFailure =
  | { kind: 'invalid-code' }
  | { kind: 'network' }
  | { kind: 'rejected'; detail?: string }
  | { kind: 'unknown' };

export type InternalLoginFailure =
  { kind: 'cancelled' } | { kind: 'unavailable' } | { kind: 'failed' };

/** Translation keys (see `shared/i18n/resources.ts`). */
export type LoginMessageKey =
  | 'common.offline'
  | 'login.errors.codeStillValid'
  | 'login.errors.phoneNotRegistered'
  | 'login.errors.invalidCode'
  | 'login.errors.unknown'
  | 'login.internalUnavailable';

/** What to tell the user after asking for a code failed. `detail` is the backend's own text, if any. */
export function describeSmsFailure(failure: SmsRequestFailure): {
  key: LoginMessageKey;
  detail?: string;
} {
  switch (failure.kind) {
    case 'code-still-valid':
      return { key: 'login.errors.codeStillValid' };
    case 'phone-not-registered':
      return { key: 'login.errors.phoneNotRegistered' };
    case 'network':
      return { key: 'common.offline' };
    case 'rejected':
      return { key: 'login.errors.unknown', detail: failure.detail };
    case 'unknown':
      return { key: 'login.errors.unknown' };
  }
}

export function describeLoginFailure(failure: LoginFailure): {
  key: LoginMessageKey;
  detail?: string;
} {
  switch (failure.kind) {
    case 'invalid-code':
      return { key: 'login.errors.invalidCode' };
    case 'network':
      return { key: 'common.offline' };
    case 'rejected':
      return { key: 'login.errors.unknown', detail: failure.detail };
    case 'unknown':
      return { key: 'login.errors.unknown' };
  }
}

/** Null when nothing needs to be said, for example after the user cancelled. */
export function describeInternalFailure(failure: InternalLoginFailure): LoginMessageKey | null {
  switch (failure.kind) {
    case 'cancelled':
      return null;
    case 'unavailable':
      return 'login.internalUnavailable';
    case 'failed':
      return 'login.errors.unknown';
  }
}

/** What `react-native-app-auth`'s `authorize()` throws when the sign-in sheet does not succeed. */
export type AppAuthFailure = { code?: string; message?: string };

/**
 * Codes `authorize()` throws for a cancel. Gathered from the library's own native source
 * (`node_modules/react-native-app-auth`) and confirmed on a device (2026-09-22, iOS 27 simulator):
 * declining the system prompt "___ wants to use login.microsoftonline.com to sign in" produced
 * `authentication_failed` with a message that does **not** mention "cancel" — Foundation's generic
 * description for the underlying `NSError`, not a string AppAuth wrote itself. Message-sniffing is
 * therefore not reliable; the code alone decides.
 *
 * - `access_denied`: the user declined consent at Microsoft's own screen (a real OAuth code).
 * - `user_cancelled_authorization`: AppAuth-Android's own stable string for a dismissed sheet.
 * - `authentication_failed`: AppAuth-iOS's fallback for anything outside the three OAuth error
 *   domains, confirmed above to include a cancel. `browser_not_found` and
 *   `service_configuration_fetch_error` are separate codes for the other distinct failures
 *   `authorize()` can have, so what is left here is overwhelmingly a cancel; on the rare genuine
 *   failure that also lands here, the user sees nothing and can just try again.
 * - `authentication_error`: AppAuth-Android's analogous fallback in `onActivityResult`, for the
 *   same reason (not yet confirmed on a device).
 */
const CANCELLED_CODES = new Set([
  'access_denied',
  'user_cancelled_authorization',
  'authentication_failed',
  'authentication_error',
]);

/** Turns an `authorize()` failure into what the login screen shows. */
export function classifyInternalAuthError(failure: AppAuthFailure): InternalLoginFailure {
  return failure.code !== undefined && CANCELLED_CODES.has(failure.code)
    ? { kind: 'cancelled' }
    : { kind: 'failed' };
}
