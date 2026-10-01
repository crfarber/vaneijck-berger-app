import { describe, expect, it, vi } from 'vitest';
import {
  AuthExpiredError,
  HttpError,
  NetworkError,
  TimeoutError,
  TokenRefreshError,
} from '@/shared/api/errors';
import { createHttpClient } from '@/shared/api/http-client';
import { createFakeClock, jsonResponse, problemResponse } from '@/test/fakes';
import {
  classifySmsRequestError,
  createExternalAuthApi,
  parseOAuthError,
} from './external-auth-api';

const NOW = Date.UTC(2026, 8, 21, 12, 0, 0);

function setup() {
  const fetchMock = vi.fn<typeof fetch>();
  const http = createHttpClient({
    baseUrl: 'https://api.test',
    fetch: fetchMock,
    getAccessToken: async () => {
      throw new Error('sign-in calls must not ask for an access token');
    },
    refreshAccessToken: async () => {
      throw new Error('sign-in calls must not refresh');
    },
  });
  const api = createExternalAuthApi({
    http,
    clock: createFakeClock(NOW),
    clientId: 'external-client',
  });
  const call = (index = 0) => {
    const [url, init] = fetchMock.mock.calls[index] ?? [];
    return {
      url: String(url),
      init: init ?? {},
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
  };
  return { api, fetchMock, call };
}

const tokens = { access_token: 'access-x', refresh_token: 'refresh-x', expires_in: 3600 };
const oauthError = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status });

describe('parseOAuthError', () => {
  it('reads error and description', () => {
    expect(parseOAuthError('{"error":"invalid_grant","error_description":"bad code"}')).toEqual({
      error: 'invalid_grant',
      description: 'bad code',
    });
  });

  it.each([[null], [undefined], [''], ['not json'], ['[]'], ['{}'], ['{"error":5}'], ['"text"']])(
    'returns null for %j',
    (body) => {
      expect(parseOAuthError(body)).toBeNull();
    },
  );
});

describe('classifySmsRequestError', () => {
  const http = (status: number, detail?: string) =>
    new HttpError(status, detail === undefined ? null : { detail });

  it('recognises a code that is still valid', () => {
    expect(
      classifySmsRequestError(http(500, 'The current code is NOT YET EXPIRED for this user')),
    ).toEqual({
      kind: 'code-still-valid',
    });
  });

  it('recognises an unknown phone number', () => {
    expect(
      classifySmsRequestError(http(400, 'PhoneNumber does not exists or not an internal user')),
    ).toEqual({
      kind: 'phone-not-registered',
    });
  });

  it('passes on any other reason the backend gave for refusing', () => {
    expect(classifySmsRequestError(http(400, 'Number is blocked'))).toEqual({
      kind: 'rejected',
      detail: 'Number is blocked',
    });
  });

  it('does not treat the "still valid" text as such on another status', () => {
    expect(classifySmsRequestError(http(400, 'current code is not yet expired'))).toMatchObject({
      kind: 'rejected',
    });
  });

  it.each([
    ['a 400 without detail', http(400)],
    ['a server error', http(500, 'Something else')],
    ['an unrelated error', new Error('boom')],
    ['a non-error', 'boom'],
  ])('reports %s as unknown', (_name, error) => {
    expect(classifySmsRequestError(error)).toEqual({ kind: 'unknown' });
  });

  it('reports a missing connection as network', () => {
    expect(classifySmsRequestError(new NetworkError())).toEqual({ kind: 'network' });
    expect(classifySmsRequestError(new TimeoutError(1000))).toEqual({ kind: 'network' });
  });
});

describe('requestSmsCode', () => {
  it('asks for a code without a token, with the plus sign encoded', async () => {
    const { api, fetchMock, call } = setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await api.requestSmsCode('+31612345678');

    expect(result).toEqual({ ok: true, value: undefined });
    expect(call().url).toBe('https://api.test/api/users/login?phoneNumber=%2B31612345678');
    expect(call().init.method).toBe('GET');
    expect(call().headers.Authorization).toBeUndefined();
  });

  it('returns the reason when the backend refuses', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(
      problemResponse(400, { detail: 'PhoneNumber does not exists or not an internal user' }),
    );

    expect(await api.requestSmsCode('+31600000000')).toEqual({
      ok: false,
      error: { kind: 'phone-not-registered' },
    });
  });

  it('reports a network failure', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    expect(await api.requestSmsCode('+31612345678')).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });
});

describe('loginWithSmsCode', () => {
  it('posts the credentials as a form and turns the answer into tokens', async () => {
    const { api, fetchMock, call } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(tokens));

    const result = await api.loginWithSmsCode({ phoneNumber: '+31612345678', code: '123456' });

    expect(result).toEqual({
      ok: true,
      value: { accessToken: 'access-x', refreshToken: 'refresh-x', expiresAt: NOW + 3_600_000 },
    });
    expect(call().url).toBe('https://api.test/connect/token');
    expect(call().init.method).toBe('POST');
    expect(call().headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(call().init.body).toBe(
      'grant_type=password&client_id=external-client&username=%2B31612345678&password=123456&scope=openid',
    );
    expect(call().headers.Authorization).toBeUndefined();
  });

  it('accepts expires_in as a string', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...tokens, expires_in: '1800' }));

    const result = await api.loginWithSmsCode({ phoneNumber: '+31612345678', code: '1' });

    expect(result.ok && result.value.expiresAt).toBe(NOW + 1_800_000);
  });

  it.each([
    ['invalid_grant', oauthError(400, { error: 'invalid_grant' })],
    ['a 401', new Response(null, { status: 401 })],
  ])('reports a wrong or expired code for %s', async (_name, response) => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(response);

    expect(await api.loginWithSmsCode({ phoneNumber: '+31612345678', code: '000000' })).toEqual({
      ok: false,
      error: { kind: 'invalid-code' },
    });
  });

  it('passes on the description of any other refusal', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(
      oauthError(400, { error: 'invalid_request', error_description: 'Too many attempts' }),
    );

    expect(await api.loginWithSmsCode({ phoneNumber: '+31612345678', code: '1' })).toEqual({
      ok: false,
      error: { kind: 'rejected', detail: 'Too many attempts' },
    });
  });

  it.each([
    ['invalid_client', 'Unknown client'],
    ['unauthorized_client', 'Client cannot use this grant'],
  ])('does not treat %s as a wrong SMS code', async (error, description) => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(oauthError(400, { error, error_description: description }));

    expect(await api.loginWithSmsCode({ phoneNumber: '+31612345678', code: '123456' })).toEqual({
      ok: false,
      error: { kind: 'rejected', detail: description },
    });
  });

  it('reports an unexpected answer as unknown', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'only this' }));

    expect(await api.loginWithSmsCode({ phoneNumber: '+31612345678', code: '1' })).toEqual({
      ok: false,
      error: { kind: 'unknown' },
    });
  });

  it('reports a server error as unknown and a lost connection as network', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    expect(await api.loginWithSmsCode({ phoneNumber: '+31612345678', code: '1' })).toEqual({
      ok: false,
      error: { kind: 'unknown' },
    });
    expect(await api.loginWithSmsCode({ phoneNumber: '+31612345678', code: '1' })).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });
});

describe('refresh', () => {
  it('exchanges the refresh token, with special characters encoded', async () => {
    const { api, fetchMock, call } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(tokens));

    const result = await api.refresh('a+b/c=');

    expect(result).toEqual({
      accessToken: 'access-x',
      refreshToken: 'refresh-x',
      expiresAt: NOW + 3_600_000,
    });
    expect(call().init.body).toBe(
      'grant_type=refresh_token&client_id=external-client&refresh_token=a%2Bb%2Fc%3D&scope=openid%20profile',
    );
  });

  it.each([
    ['invalid_grant', oauthError(400, { error: 'invalid_grant' })],
    ['a 401', new Response(null, { status: 401 })],
    ['a 403', new Response(null, { status: 403 })],
  ])('reports a refusal for good for %s', async (_name, response) => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(response);

    const error = await api.refresh('token').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthExpiredError);
    expect(error).toMatchObject({ reason: 'refresh-rejected' });
  });

  it.each([
    ['a server error', () => new Response(null, { status: 503 })],
    ['throttling', () => new Response(null, { status: 429 })],
    ['a 400 without OAuth error', () => new Response('oops', { status: 400 })],
    ['a body without tokens', () => jsonResponse({ hello: 'world' })],
  ])('reports %s as a temporary failure', async (_name, response) => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(response());

    await expect(api.refresh('token')).rejects.toBeInstanceOf(TokenRefreshError);
  });

  it('reports a lost connection as a temporary failure', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(api.refresh('token')).rejects.toBeInstanceOf(TokenRefreshError);
  });
});
