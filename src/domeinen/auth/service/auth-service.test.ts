import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { createFakeClock, createInMemorySecretStore, createRecordingSleep } from '@/test/fakes';
import type { ExternalAuthApi } from '../api/external-auth-api';
import { createAuthService, createRefresher, type InternalAuth } from './auth-service';
import { createSessionRepository } from './session-repository';
import { createTokenProvider, type Refresher } from './token-provider';

const NOW = Date.UTC(2026, 8, 21, 12, 0, 0);
const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: NOW + 3_600_000 };

function setup(options: { internal?: InternalAuth | null; onSignedOut?: () => void } = {}) {
  const store = createInMemorySecretStore();
  const provider = createTokenProvider({
    repository: createSessionRepository(store),
    refresh: vi.fn<Refresher>(),
    clock: createFakeClock(NOW),
    sleep: createRecordingSleep().sleep,
  });
  const external: ExternalAuthApi = {
    requestSmsCode: vi.fn(async () => ok(undefined)),
    loginWithSmsCode: vi.fn(async () => ok(tokens)),
    refresh: vi.fn(async () => tokens),
  };
  const internal: InternalAuth | null =
    options.internal === undefined
      ? {
          signIn: vi.fn(async () => ok(tokens)),
          refresh: vi.fn(async () => tokens),
        }
      : options.internal;
  const service = createAuthService({
    provider,
    external,
    internal,
    onSignedOut: options.onSignedOut,
  });
  return { service, provider, external, internal, store };
}

describe('requestSmsCode', () => {
  it('passes the request on to the backend', async () => {
    const { service, external } = setup();

    expect(await service.requestSmsCode('+31612345678')).toEqual({ ok: true, value: undefined });
    expect(external.requestSmsCode).toHaveBeenCalledWith('+31612345678');
  });

  it('passes a failure on unchanged', async () => {
    const { service, external } = setup();
    vi.mocked(external.requestSmsCode).mockResolvedValueOnce(err({ kind: 'phone-not-registered' }));

    expect(await service.requestSmsCode('+31600000000')).toEqual({
      ok: false,
      error: { kind: 'phone-not-registered' },
    });
  });
});

describe('signInWithSmsCode', () => {
  it('signs in as an external user', async () => {
    const { service, provider, external } = setup();

    const result = await service.signInWithSmsCode('+31612345678', '123456');

    expect(result).toEqual({ ok: true, value: undefined });
    expect(external.loginWithSmsCode).toHaveBeenCalledWith({
      phoneNumber: '+31612345678',
      code: '123456',
    });
    expect(provider.getStatus()).toBe('signed-in');
    expect(provider.getUserType()).toBe('external');
    expect(await provider.getAccessToken()).toBe('access-1');
  });

  it('does not sign in when the code is wrong', async () => {
    const { service, provider, external, store } = setup();
    vi.mocked(external.loginWithSmsCode).mockResolvedValueOnce(err({ kind: 'invalid-code' }));

    const result = await service.signInWithSmsCode('+31612345678', '000000');

    expect(result).toEqual({ ok: false, error: { kind: 'invalid-code' } });
    expect(provider.getUserType()).toBeNull();
    expect(store.dump()).toEqual({});
  });
});

describe('signInInternal', () => {
  it('signs in as an internal user', async () => {
    const { service, provider } = setup();

    expect(await service.signInInternal()).toEqual({ ok: true, value: undefined });
    expect(provider.getUserType()).toBe('internal');
  });

  it('reports that internal sign-in is unavailable when Azure AD is not configured', async () => {
    const { service, provider } = setup({ internal: null });

    expect(await service.signInInternal()).toEqual({ ok: false, error: { kind: 'unavailable' } });
    expect(provider.getUserType()).toBeNull();
  });

  it('does not sign in when the user cancels', async () => {
    const internal: InternalAuth = {
      signIn: vi.fn(async () => err({ kind: 'cancelled' as const })),
      refresh: vi.fn(),
    };
    const { service, provider } = setup({ internal });

    expect(await service.signInInternal()).toEqual({ ok: false, error: { kind: 'cancelled' } });
    expect(provider.getUserType()).toBeNull();
  });
});

describe('signOut', () => {
  it('signs out and then lets the app clean up its user data', async () => {
    const onSignedOut = vi.fn();
    const { service, provider, store } = setup({ onSignedOut });
    await service.signInWithSmsCode('+31612345678', '123456');

    await service.signOut();

    expect(provider.getStatus()).toBe('signed-out');
    expect(store.dump()).toEqual({});
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('works without a cleanup callback', async () => {
    const { service, provider } = setup();
    await service.signInWithSmsCode('+31612345678', '123456');

    await expect(service.signOut()).resolves.toBeUndefined();
    expect(provider.getStatus()).toBe('signed-out');
  });
});

describe('createRefresher', () => {
  const session = (userType: 'internal' | 'external') => ({
    userType,
    accessToken: 'a',
    refreshToken: 'r',
    expiresAt: NOW,
  });

  it('uses the SMS backend for external users', async () => {
    const { external, internal } = setup();
    const refresher = createRefresher(external, internal);

    await refresher(session('external'));

    expect(external.refresh).toHaveBeenCalledWith('r');
    expect(internal?.refresh).not.toHaveBeenCalled();
  });

  it('uses Azure AD for internal users', async () => {
    const { external, internal } = setup();
    const refresher = createRefresher(external, internal);

    await refresher(session('internal'));

    expect(internal?.refresh).toHaveBeenCalledWith('r');
    expect(external.refresh).not.toHaveBeenCalled();
  });

  it('fails for an internal session when Azure AD is not configured', async () => {
    const { external } = setup();

    await expect(createRefresher(external, null)(session('internal'))).rejects.toThrow(
      'not configured',
    );
  });
});
