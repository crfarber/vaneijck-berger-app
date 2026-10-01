export { createExternalAuthApi } from './api/external-auth-api';
export type { ExternalAuthApi } from './api/external-auth-api';
export {
  describeInternalFailure,
  describeLoginFailure,
  describeSmsFailure,
} from './domain/login-failures';
export type {
  InternalLoginFailure,
  LoginFailure,
  LoginMessageKey,
  SmsRequestFailure,
} from './domain/login-failures';
export {
  countryForDialCode,
  LOGIN_COUNTRIES,
  matchDialPrefix,
  DEFAULT_COUNTRY_CODE,
} from './domain/country-codes';
export type { CountryId, LoginCountry } from './domain/country-codes';
export {
  applyPhoneInput,
  isPlausiblePhoneNumber,
  languageForCountryCode,
  normalizePhoneNumber,
} from './domain/phone-number';
export type { Session, UserType } from './domain/session';
export { createAuthService, createRefresher } from './service/auth-service';
export type { AuthService, InternalAuth } from './service/auth-service';
export { createSessionLifecycle } from './service/session-lifecycle';
export type { Scheduler, SessionLifecycle } from './service/session-lifecycle';
export { createSessionRepository, SESSION_KEY } from './service/session-repository';
export { createTokenProvider } from './service/token-provider';
export type { SessionEvent, SessionStatus, TokenProvider } from './service/token-provider';
export { bindSessionStore, createSessionStore } from './store/session-store';
export type { SessionState, SessionStore } from './store/session-store';
