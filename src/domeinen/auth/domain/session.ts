import { z } from 'zod';

/** Who signed in. Internal users sign in with Azure AD, external users with an SMS code. */
export const USER_TYPES = ['internal', 'external'] as const;
export type UserType = (typeof USER_TYPES)[number];

/**
 * Everything that makes up a signed-in session, in ONE value that is stored in one write. The old
 * app kept access token, refresh token, expiry and user type under four keys that could get out of
 * sync (the SMS login even wrote the expiry under a different key than the one that was read).
 */
export type Session = {
  readonly userType: UserType;
  readonly accessToken: string;
  /** Never empty: without it the session cannot be recovered. */
  readonly refreshToken: string;
  /** Epoch milliseconds at which the access token stops being valid. */
  readonly expiresAt: number;
};

export const sessionSchema = z.object({
  userType: z.enum(USER_TYPES),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
});

/** A token that expires within this margin is refreshed before it is used. */
export const ACCESS_TOKEN_SKEW_MS = 2 * 60 * 1000;

/** The background refresh runs this long before the token expires. */
export const PROACTIVE_REFRESH_LEAD_MS = 5 * 60 * 1000;

/** The token is valid and stays valid long enough to be used for a request. */
export function isAccessTokenFresh(session: Pick<Session, 'expiresAt'>, now: number): boolean {
  return session.expiresAt - now > ACCESS_TOKEN_SKEW_MS;
}

export function isAccessTokenExpired(session: Pick<Session, 'expiresAt'>, now: number): boolean {
  return session.expiresAt <= now;
}

/** Milliseconds until the background refresh is due. Zero when it is due now. */
export function getProactiveRefreshDelay(expiresAt: number, now: number): number {
  return Math.max(0, expiresAt - PROACTIVE_REFRESH_LEAD_MS - now);
}

/** Reads a stored session. Anything that is not a complete, valid session is treated as no session. */
export function parseStoredSession(raw: string | null): Session | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
