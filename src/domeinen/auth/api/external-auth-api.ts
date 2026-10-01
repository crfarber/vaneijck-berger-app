import { z } from 'zod';
import {
  AuthExpiredError,
  HttpError,
  NetworkError,
  TimeoutError,
  TokenRefreshError,
} from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import type { Logger } from '@/shared/logging/logger';
import type { Clock } from '@/shared/platform/ports';
import { err, ok, type Result } from '@/shared/result';
import type { LoginFailure, SmsRequestFailure } from '../domain/login-failures';
import { classifyRefreshFailure } from '../domain/refresh-policy';
import type { TokenSet } from '../service/token-provider';

/**
 * Sign-in for external berger companies: the backend sends an SMS code and exchanges it for
 * tokens at the standard OAuth token endpoint.
 */

/** Scopes as the old app sent them. Confirm with the backend team before changing. */
export const EXTERNAL_LOGIN_SCOPE = 'openid';
export const EXTERNAL_REFRESH_SCOPE = 'openid profile';

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  // Arrives as a number, but some proxies turn it into a string.
  expires_in: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]),
});

const oauthErrorSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type OAuthError = { error?: string; description?: string };

/** Reads an OAuth error response body. Null when the body is not one. */
export function parseOAuthError(body: string | null | undefined): OAuthError | null {
  if (!body) {
    return null;
  }
  try {
    const parsed = oauthErrorSchema.safeParse(JSON.parse(body));
    if (!parsed.success || (parsed.data.error === undefined && !parsed.data.error_description)) {
      return null;
    }
    return { error: parsed.data.error, description: parsed.data.error_description };
  } catch {
    return null;
  }
}

const CODE_STILL_VALID = 'current code is not yet expired';
const PHONE_NOT_REGISTERED = 'phonenumber does not exists or not an internal user';

/** Turns an error from the "send me a code" call into something the login screen can act on. */
export function classifySmsRequestError(error: unknown): SmsRequestFailure {
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return { kind: 'network' };
  }
  if (error instanceof HttpError) {
    const detail = error.problem?.detail ?? '';
    const lower = detail.toLowerCase();
    if (error.status === 500 && lower.includes(CODE_STILL_VALID)) {
      return { kind: 'code-still-valid' };
    }
    if (error.status === 400 && detail) {
      return lower.includes(PHONE_NOT_REGISTERED)
        ? { kind: 'phone-not-registered' }
        : { kind: 'rejected', detail };
    }
  }
  return { kind: 'unknown' };
}

function classifyLoginError(error: unknown): LoginFailure {
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return { kind: 'network' };
  }
  if (error instanceof HttpError) {
    const oauth = parseOAuthError(error.body);
    // A missing or unknown client_id is a configuration problem, not a wrong SMS code.
    if (oauth?.error === 'invalid_client' || oauth?.error === 'unauthorized_client') {
      return { kind: 'rejected', detail: oauth.description };
    }
    if (oauth?.error === 'invalid_grant' || error.status === 401 || error.status === 403) {
      return { kind: 'invalid-code' };
    }
    if (error.status >= 400 && error.status < 500) {
      return { kind: 'rejected', detail: oauth?.description ?? error.problem?.detail };
    }
  }
  return { kind: 'unknown' };
}

export type ExternalAuthApi = {
  /** Asks the backend to send an SMS code to the number (international format). */
  requestSmsCode(phoneNumber: string): Promise<Result<void, SmsRequestFailure>>;
  /** Exchanges the phone number and SMS code for tokens. Expected failures come back as a result. */
  loginWithSmsCode(input: {
    phoneNumber: string;
    code: string;
  }): Promise<Result<TokenSet & { refreshToken: string }, LoginFailure>>;
  /** Exchanges a refresh token. Throws AuthExpiredError when refused for good, TokenRefreshError otherwise. */
  refresh(refreshToken: string): Promise<TokenSet & { refreshToken: string }>;
};

export type ExternalAuthDeps = {
  http: HttpClient;
  clock: Clock;
  clientId: string;
  logger?: Logger;
};

export function createExternalAuthApi(deps: ExternalAuthDeps): ExternalAuthApi {
  const { http, clock, clientId, logger } = deps;

  const toTokenSet = (response: z.infer<typeof tokenResponseSchema>) => ({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: clock.now() + response.expires_in * 1000,
  });

  return {
    async requestSmsCode(phoneNumber) {
      try {
        await http.request('/api/users/login', {
          query: { phoneNumber },
          auth: false,
          responseType: 'none',
        });
        return ok(undefined);
      } catch (error) {
        const failure = classifySmsRequestError(error);
        logger?.warn('auth', 'SMS code request failed', { kind: failure.kind });
        return err(failure);
      }
    },

    async loginWithSmsCode({ phoneNumber, code }) {
      try {
        const response = await http.requestJson('/connect/token', tokenResponseSchema, {
          method: 'POST',
          auth: false,
          form: {
            grant_type: 'password',
            client_id: clientId,
            username: phoneNumber,
            password: code,
            scope: EXTERNAL_LOGIN_SCOPE,
          },
        });
        return ok(toTokenSet(response));
      } catch (error) {
        const failure = classifyLoginError(error);
        const oauth = error instanceof HttpError ? parseOAuthError(error.body) : null;
        logger?.warn('auth', 'SMS login failed', {
          kind: failure.kind,
          status: error instanceof HttpError ? error.status : undefined,
          oauthError: oauth?.error,
        });
        return err(failure);
      }
    },

    async refresh(refreshToken) {
      try {
        const response = await http.requestJson('/connect/token', tokenResponseSchema, {
          method: 'POST',
          auth: false,
          form: {
            grant_type: 'refresh_token',
            client_id: clientId,
            refresh_token: refreshToken,
            scope: EXTERNAL_REFRESH_SCOPE,
          },
        });
        return toTokenSet(response);
      } catch (error) {
        if (error instanceof HttpError) {
          const kind = classifyRefreshFailure({
            status: error.status,
            oauthError: parseOAuthError(error.body)?.error,
          });
          if (kind === 'definitive') {
            throw new AuthExpiredError('refresh-rejected', { cause: error });
          }
        }
        throw new TokenRefreshError({ cause: error });
      }
    },
  };
}
