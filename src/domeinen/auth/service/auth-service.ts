import type { Logger } from '@/shared/logging/logger';
import { err, ok, type Result } from '@/shared/result';
import type { ExternalAuthApi } from '../api/external-auth-api';
import type {
  InternalLoginFailure,
  LoginFailure,
  SmsRequestFailure,
} from '../domain/login-failures';
import type { Refresher, TokenProvider, TokenSet } from './token-provider';

/** Azure AD sign-in for internal users. Implemented on the device (a browser sheet) in `platform/rn`. */
export type InternalAuth = {
  signIn(): Promise<Result<Required<TokenSet>, InternalLoginFailure>>;
  refresh(refreshToken: string): Promise<TokenSet>;
};

/** Picks the refresh mechanism that belongs to the user type of the session. */
export function createRefresher(
  external: ExternalAuthApi,
  internal: InternalAuth | null,
): Refresher {
  return async (session) => {
    if (session.userType === 'external') {
      return external.refresh(session.refreshToken);
    }
    if (internal === null) {
      throw new Error('Internal sign-in is not configured in this build');
    }
    return internal.refresh(session.refreshToken);
  };
}

export type AuthService = {
  requestSmsCode(phoneNumber: string): Promise<Result<void, SmsRequestFailure>>;
  signInWithSmsCode(phoneNumber: string, code: string): Promise<Result<void, LoginFailure>>;
  signInInternal(): Promise<Result<void, InternalLoginFailure>>;
  signOut(): Promise<void>;
};

export type AuthServiceDeps = {
  provider: TokenProvider;
  external: ExternalAuthApi;
  /** Null when Azure AD is not configured for this build. */
  internal: InternalAuth | null;
  /** Called after sign-out so caches and stored user data can be dropped. */
  onSignedOut?: () => Promise<void> | void;
  logger?: Logger;
};

export function createAuthService(deps: AuthServiceDeps): AuthService {
  const { provider, external, internal, logger } = deps;

  return {
    requestSmsCode: (phoneNumber) => external.requestSmsCode(phoneNumber),

    async signInWithSmsCode(phoneNumber, code) {
      const result = await external.loginWithSmsCode({ phoneNumber, code });
      if (!result.ok) {
        return result;
      }
      await provider.signIn({ userType: 'external', ...result.value });
      logger?.info('auth', 'Signed in (external)');
      return ok(undefined);
    },

    async signInInternal() {
      if (internal === null) {
        return err({ kind: 'unavailable' });
      }
      const result = await internal.signIn();
      if (!result.ok) {
        return result;
      }
      await provider.signIn({ userType: 'internal', ...result.value });
      logger?.info('auth', 'Signed in (internal)');
      return ok(undefined);
    },

    async signOut() {
      await provider.signOut('user');
      await deps.onSignedOut?.();
    },
  };
}
