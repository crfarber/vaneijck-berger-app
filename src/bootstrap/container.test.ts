import { describe, expect, it } from 'vitest';
import { DEFAULT_AVAILABILITY, decideChangeVehicle } from '@/domeinen/allocation-unit';
import {
  allocationKeys,
  createAllocationSections,
  hasActiveAllocations,
} from '@/domeinen/allocations';
import type { NotificationSource, PushGateway, RemoteMessage } from '@/domeinen/notifications';
import { decideOnboarding } from '@/domeinen/onboarding';
import { createInMemoryPhotoFiles, type PhotoFiles } from '@/domeinen/photos';
import type { DevicePermissions } from '@/domeinen/settings';
import { AuthExpiredError, TokenRefreshError } from '@/shared/api/errors';
import type { RuntimeConfig } from '@/shared/config/runtime-config';
import {
  createFakeClock,
  createFakeScheduler,
  createInMemorySecretStore,
  createInMemoryStore,
  deferred,
  createRecordingSleep,
  flushPromises,
  jsonResponse,
  problemResponse,
} from '@/test/fakes';
import { createContainer } from './container';

/**
 * The walking skeleton: the real parts, wired as in the app, with a fake device and a fake
 * backend. If these pass, sign-in, token handling and data loading work together.
 */

const NOW = Date.UTC(2026, 8, 21, 12, 0, 0);
const MINUTE = 60_000;

const config: RuntimeConfig = {
  apiBaseUrl: 'https://api.test',
  environment: 'internal',
  azureAd: null,
  externalClientId: 'external-client',
  googlePlacesApiKey: null,
};

type Recorded = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | undefined;
};
type Responder = (request: Recorded) => Response | Promise<Response>;

function createBackend() {
  const requests: Recorded[] = [];
  const queues = new Map<string, Responder[]>();
  const defaults = new Map<string, Responder>();

  const key = (method: string, path: string) => `${method} ${path}`;

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const request: Recorded = {
      method,
      path: url.pathname,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? init.body : undefined,
    };
    requests.push(request);

    const routeKey = key(method, url.pathname);
    const responder = queues.get(routeKey)?.shift() ?? defaults.get(routeKey);
    if (!responder) {
      throw new Error(`No fake route for ${routeKey}`);
    }
    return responder(request);
  };

  return {
    fetch: fetchImpl,
    requests,
    /** Answers every request to the route. */
    on(method: string, path: string, responder: Responder) {
      defaults.set(key(method, path), responder);
    },
    /** Answers only the next request to the route. */
    once(method: string, path: string, responder: Responder) {
      queues.set(key(method, path), [...(queues.get(key(method, path)) ?? []), responder]);
    },
    callsTo: (method: string, path: string) =>
      requests.filter((request) => request.method === method && request.path === path),
  };
}

const tokenBody = (access: string, refresh: string, expiresIn = 3600) =>
  jsonResponse({ access_token: access, refresh_token: refresh, expires_in: expiresIn });

const allocationRow = {
  dn_allocationid: 'alloc-1',
  statuscode: 875920000,
  statecode: 0,
  dn_IncidentId: {
    dn_incidentid: 'inc-1',
    statuscode: 875920001,
    dn_name: 'A2 Utrecht',
    dn_dn_incident_dn_service_IncidentId: [
      { dn_serviceid: 'svc-1', statuscode: 875920000, statecode: 0, dn_servicetypecode: 1004 },
    ],
  },
};

const storedSession = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    userType: 'external',
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: NOW + 60 * MINUTE,
    ...overrides,
  });

function deniedPermissions(): DevicePermissions {
  const denied = async () => ({ status: 'denied' as const, canAskAgain: false });
  return { read: denied, request: denied, openSystemSettings: async () => undefined };
}

function createDeniedPushGateway(): PushGateway {
  return {
    ensureReady: async () => undefined,
    permission: async () => 'denied',
    token: async () => null,
    onToken: () => () => undefined,
    listen: () => () => undefined,
    showBanner: async () => undefined,
  };
}

function setup(
  options: {
    stored?: string;
    pushGateway?: PushGateway;
    keyValueStore?: ReturnType<typeof createInMemoryStore>;
    photoFiles?: PhotoFiles;
  } = {},
) {
  const clock = createFakeClock(NOW);
  const secretStore = createInMemorySecretStore(
    options.stored === undefined ? {} : { 'auth.session': options.stored },
  );
  const backend = createBackend();
  const scheduler = createFakeScheduler();
  const recording = createRecordingSleep();

  backend.on('GET', '/api/allocations', () => jsonResponse([allocationRow]));
  backend.on('POST', '/connect/token', () => tokenBody('access-2', 'refresh-2'));
  // Sign-in and restore kick off a reference-data sync in the background; nothing changed is the
  // harmless default so it does not show up in tests that assert the exact list of requests.
  backend.on('GET', '/api/client-sync/schema/1043', () => jsonResponse([]));

  const opened: string[] = [];
  const keyValueStore = options.keyValueStore ?? createInMemoryStore();
  const container = createContainer({
    config,
    secretStore,
    keyValueStore,
    language: 'nl',
    internalAuth: null,
    locationReader: { getCurrent: async () => ({ isValid: true, latitude: 52, longitude: 5 }) },
    devicePermissions: deniedPermissions(),
    logShare: { share: async () => undefined },
    photoFiles:
      options.photoFiles ??
      createInMemoryPhotoFiles({
        'file:///camera/shot.jpg': new Uint8Array([1, 2, 3]),
      }),
    pushGateway: options.pushGateway ?? createDeniedPushGateway(),
    notificationNavigation: {
      openAllocations() {
        opened.push('overview');
      },
    },
    fetch: backend.fetch,
    clock,
    sleep: recording.sleep,
    scheduler,
  });

  return {
    container,
    backend,
    clock,
    secretStore,
    keyValueStore,
    scheduler,
    sleeps: recording.delays,
    opened,
  };
}

describe('signing in', () => {
  it('signs in with an SMS code, stores the session and loads data with the token', async () => {
    const { container, backend, secretStore } = setup();
    backend.on('GET', '/api/users/login', () => new Response(null, { status: 200 }));
    backend.on('POST', '/connect/token', () => tokenBody('access-1', 'refresh-1'));
    await container.start();
    expect(container.sessionStore.getState().status).toBe('signed-out');

    expect((await container.authService.requestSmsCode('+31612345678')).ok).toBe(true);
    const login = await container.authService.signInWithSmsCode('+31612345678', '123456');

    expect(login.ok).toBe(true);
    expect(container.sessionStore.getState()).toMatchObject({
      status: 'signed-in',
      userType: 'external',
    });
    expect(JSON.parse(secretStore.dump()['auth.session'] ?? '{}')).toMatchObject({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: NOW + 60 * MINUTE,
    });

    const allocations = await container.allocationsApi.list();

    expect(allocations.map((allocation) => allocation.dn_allocationid)).toEqual(['alloc-1']);
    expect(backend.callsTo('GET', '/api/allocations')[0]?.headers.Authorization).toBe(
      'Bearer access-1',
    );
  });

  it('does not sign in with a wrong code', async () => {
    const { container, backend, secretStore } = setup();
    backend.on(
      'POST',
      '/connect/token',
      () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }),
    );
    await container.start();

    const login = await container.authService.signInWithSmsCode('+31612345678', '000000');

    expect(login).toEqual({ ok: false, error: { kind: 'invalid-code' } });
    expect(container.sessionStore.getState().status).toBe('signed-out');
    expect(secretStore.dump()).toEqual({});
  });
});

describe('starting the app', () => {
  it('restores a stored session and uses its token', async () => {
    const { container, backend } = setup({ stored: storedSession() });

    await container.start();

    expect(container.sessionStore.getState()).toMatchObject({
      status: 'signed-in',
      userType: 'external',
    });
    await container.allocationsApi.list();
    expect(backend.callsTo('GET', '/api/allocations')[0]?.headers.Authorization).toBe(
      'Bearer access-1',
    );
  });

  it('shows the login when the stored session is damaged', async () => {
    const { container, secretStore } = setup({ stored: '{"userType":"external"}' });

    await container.start();

    expect(container.sessionStore.getState().status).toBe('signed-out');
    expect(secretStore.dump()).toEqual({});
  });

  it('shows the login when secure storage cannot be read, instead of a blank screen', async () => {
    const { container, secretStore } = setup();
    secretStore.getItem = () => Promise.reject(new Error('keychain locked'));

    await container.start();

    expect(container.sessionStore.getState().status).toBe('signed-out');
    expect(container.logger.entries().some((entry) => entry.level === 'error')).toBe(true);
  });
});

describe('language', () => {
  it('switches at once and starts in the chosen language next time, also after signing out', async () => {
    const keyValueStore = createInMemoryStore();
    const first = setup({ stored: storedSession(), keyValueStore });
    await first.container.start();
    expect(first.container.i18n.t('common.signOut')).toBe('Uitloggen');

    await first.container.languageSettings.choose('en');
    expect(first.container.i18n.t('common.signOut')).toBe('Sign out');
    await first.container.authService.signOut();
    first.container.stop();

    const second = setup({ keyValueStore });
    await second.container.start();

    expect(second.container.i18n.language).toBe('en');
    expect(second.container.i18n.t('common.signOut')).toBe('Sign out');
  });
});

describe('reference data', () => {
  it('syncs in the background when a session starts, and resumes a failed entity next time', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.on('GET', '/api/client-sync/schema/1043', () =>
      jsonResponse(['dn_servicetype', 'dn_broken']),
    );
    backend.on('GET', '/api/client-sync/dn_servicetype/1043', () => jsonResponse([{ id: 1 }]));
    backend.once(
      'GET',
      '/api/client-sync/dn_broken/1043',
      () => new Response(null, { status: 500 }),
    );

    await container.start();
    await flushPromises();

    expect(await container.referenceDataService.getEntity('dn_servicetype')).toEqual([{ id: 1 }]);
    expect(await container.referenceDataService.getEntity('dn_broken')).toBeNull();

    backend.on('GET', '/api/client-sync/dn_broken/1043', () => jsonResponse([{ id: 2 }]));
    const result = await container.referenceDataService.sync();

    expect(result).toEqual({ synced: ['dn_broken'], failed: [] });
    expect(await container.referenceDataService.getEntity('dn_broken')).toEqual([{ id: 2 }]);
  });

  it('keeps the since date on sign-out so the next login only asks what changed', async () => {
    const { container, backend, keyValueStore } = setup({ stored: storedSession() });
    backend.on('GET', '/api/client-sync/schema/1043', () => jsonResponse(['dn_servicetype']));
    backend.on('GET', '/api/client-sync/dn_servicetype/1043', () => jsonResponse([{ id: 1 }]));

    await container.start();
    await flushPromises();
    const since = await keyValueStore.getItem('referenceData.since');
    expect(since).not.toBeNull();
    await keyValueStore.setItem(
      'referenceData.pending',
      JSON.stringify({ since: '2026-09-22T12:00:00.000Z', entities: ['dn_leftover'] }),
    );

    await container.authService.signOut();

    expect(await keyValueStore.getItem('referenceData.since')).toBe(since);
    expect(await keyValueStore.getItem('referenceData.pending')).toBeNull();
    expect(await container.referenceDataService.getEntity('dn_servicetype')).toEqual([{ id: 1 }]);
  });

  it('syncs homebaselocations and sends the chosen one when an internal berger registers', async () => {
    const { container, backend } = setup({ stored: storedSession({ userType: 'internal' }) });
    backend.on('GET', '/api/client-sync/schema/1043', () => jsonResponse(['homebaselocations']));
    backend.on('GET', '/api/client-sync/homebaselocations/1043', () =>
      jsonResponse([
        { dn_companylocationid: 'loc-1', dn_name: 'Van Eijck Utrecht', dn_city: 'Utrecht' },
      ]),
    );
    backend.on('GET', '/api/allocation-units', () => jsonResponse(null));
    backend.on(
      'POST',
      '/api/allocation-units/internalworker',
      () => new Response(null, { status: 204 }),
    );

    await container.start();
    await flushPromises();
    const [location] = await container.allocationUnitService.getHomebaseLocations();
    expect(location?.id).toBe('loc-1');

    const result = await container.allocationUnitService.registerInternal({
      vehicleId: 'truck-1',
      trailerId: null,
      endDate: new Date(NOW + 8 * 60 * MINUTE),
      availability: DEFAULT_AVAILABILITY,
      homebaseLocationId: location?.id ?? '',
    });

    expect(result).toEqual({ ok: true, value: undefined });
    const [sent] = backend.callsTo('POST', '/api/allocation-units/internalworker');
    expect(JSON.parse(sent?.body ?? '{}')).toMatchObject({
      vehicleId: 'truck-1',
      homebaseLocationId: 'loc-1',
    });
  });
});

describe('keeping the token fresh', () => {
  it('refreshes a token that is about to expire before sending the request', async () => {
    const { container, backend } = setup({
      stored: storedSession({ expiresAt: NOW + MINUTE }),
    });
    await container.start();

    await container.allocationsApi.list();

    // Excludes the reference-data sync that a restored session also kicks off in the background:
    // it shares the token refresh (single-flight) but its own request can land on either side of
    // the allocations call, depending on how the two chains happen to interleave.
    const relevant = backend.requests
      .filter((request) => !request.path.startsWith('/api/client-sync'))
      .map((request) => `${request.method} ${request.path}`);
    expect(relevant).toEqual(['POST /connect/token', 'GET /api/allocations']);
    expect(backend.callsTo('POST', '/connect/token')[0]?.body).toContain(
      'grant_type=refresh_token',
    );
    expect(backend.callsTo('GET', '/api/allocations')[0]?.headers.Authorization).toBe(
      'Bearer access-2',
    );
  });

  it('refreshes once and retries when the server answers 401', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.once('GET', '/api/allocations', () => new Response(null, { status: 401 }));
    await container.start();

    const allocations = await container.allocationsApi.list();

    expect(allocations).toHaveLength(1);
    expect(backend.callsTo('GET', '/api/allocations')).toHaveLength(2);
    expect(backend.callsTo('POST', '/connect/token')).toHaveLength(1);
    expect(backend.callsTo('GET', '/api/allocations')[1]?.headers.Authorization).toBe(
      'Bearer access-2',
    );
  });

  it('sends only one refresh when several requests need a token at the same time', async () => {
    const { container, backend } = setup({ stored: storedSession({ expiresAt: NOW + MINUTE }) });
    await container.start();

    await Promise.all([
      container.allocationsApi.list(),
      container.allocationsApi.list(),
      container.allocationsApi.getService('svc-1').catch(() => undefined),
    ]);

    expect(backend.callsTo('POST', '/connect/token')).toHaveLength(1);
  });

  it('refreshes in the background shortly before the token expires', async () => {
    const { container, backend, clock, scheduler } = setup({ stored: storedSession() });
    await container.start();
    expect(scheduler.pending().map((timer) => timer.delayMs)).toEqual([55 * MINUTE]);

    clock.advance(55 * MINUTE);
    await scheduler.fireNext();

    expect(backend.callsTo('POST', '/connect/token')).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(container.tokenProvider.getExpiresAt()))).toBe(
      clock.now() + 60 * MINUTE,
    );
  });
});

describe('when the session cannot be kept', () => {
  it('signs the user out and clears everything when the refresh token is refused', async () => {
    const { container, backend, secretStore } = setup({
      stored: storedSession({ expiresAt: NOW - MINUTE }),
    });
    backend.on(
      'POST',
      '/connect/token',
      () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }),
    );
    await container.start();
    container.queryClient.setQueryData(['allocations'], ['previous user data']);

    const error = await container.allocationsApi.list().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthExpiredError);
    expect(container.sessionStore.getState()).toMatchObject({
      status: 'signed-out',
      signedOutReason: 'expired',
    });
    expect(secretStore.dump()).toEqual({});
    expect(container.queryClient.getQueryData(['allocations'])).toBeUndefined();
  });

  it('keeps the session when the network is down during a refresh', async () => {
    const { container, backend, secretStore, sleeps } = setup({
      stored: storedSession({ expiresAt: NOW - MINUTE }),
    });
    backend.on('POST', '/connect/token', () => {
      throw new TypeError('Network request failed');
    });
    await container.start();

    const error = await container.allocationsApi.list().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TokenRefreshError);
    expect(container.sessionStore.getState().status).toBe('signed-in');
    expect(secretStore.dump()['auth.session']).toBeDefined();
    expect(sleeps).toEqual([2_000, 4_000]);
  });

  it('signs out on request and removes the data of that user', async () => {
    const { container, secretStore } = setup({ stored: storedSession() });
    await container.start();
    container.queryClient.setQueryData(['allocations'], ['data']);
    await container.serviceFormDrafts.save('alloc-1', 'svc-1', {
      answers: { field: { value: 'secret-answer', displayValue: 'secret-answer' } },
      hideSignature: {},
      noEmailConfirmation: {},
      acceptedTermsAndConditions: true,
      recommendedFieldId: null,
      expandedSections: {},
    });

    await container.authService.signOut();

    expect(container.sessionStore.getState()).toMatchObject({
      status: 'signed-out',
      signedOutReason: 'user',
    });
    expect(secretStore.dump()).toEqual({});
    expect(container.queryClient.getQueryData(['allocations'])).toBeUndefined();
    expect(await container.serviceFormDrafts.load('alloc-1', 'svc-1')).toBeNull();
  });
});

describe('privacy', () => {
  it('never writes tokens, codes or phone numbers to the log', async () => {
    const { container, backend } = setup();
    backend.on('GET', '/api/users/login', () => new Response(null, { status: 200 }));
    backend.on('POST', '/connect/token', () => tokenBody('access-secret', 'refresh-secret'));
    backend.once('GET', '/api/allocations', () => new Response(null, { status: 401 }));
    await container.start();

    await container.authService.requestSmsCode('+31612345678');
    await container.authService.signInWithSmsCode('+31612345678', '654321');
    await container.allocationsApi.list();
    await container.authService.signOut();

    const log = JSON.stringify(container.logger.entries());
    for (const secret of ['access-secret', 'refresh-secret', '654321', '31612345678']) {
      expect(log).not.toContain(secret);
    }
  });
});

describe('stopping', () => {
  it('stops following the session', async () => {
    const { container, scheduler } = setup({ stored: storedSession() });
    await container.start();

    container.stop();

    expect(scheduler.pending()).toEqual([]);
  });
});

describe('push notifications', () => {
  it('registers the device token when a session starts and permission is granted', async () => {
    const { container, backend } = setup({
      stored: storedSession(),
      pushGateway: {
        ...createDeniedPushGateway(),
        permission: async () => 'granted',
        token: async () => 'ExponentPushToken[device]',
      },
    });
    backend.on('POST', '/api/workers/register', () => new Response(null, { status: 204 }));

    await container.start();
    await flushPromises();

    const registration = backend.callsTo('POST', '/api/workers/register');
    expect(registration).toHaveLength(1);
    expect(registration[0]?.headers.Authorization).toBe('Bearer access-1');
    expect(registration[0]?.body).toBe(
      JSON.stringify({ notificationtoken: 'ExponentPushToken[device]' }),
    );
    expect(JSON.stringify(container.logger.entries())).not.toContain('ExponentPushToken[device]');
  });

  it('loads the allocation from a message into the cache, ignores the repeat, and opens the overview on a tap', async () => {
    const received: {
      listener: ((message: RemoteMessage, source: NotificationSource) => void) | null;
    } = { listener: null };
    const { container, backend, opened } = setup({
      stored: storedSession(),
      pushGateway: {
        ...createDeniedPushGateway(),
        permission: async () => 'granted',
        token: async () => 'ExponentPushToken[device]',
        listen(next) {
          received.listener = next;
          return () => {
            received.listener = null;
          };
        },
      },
    });
    backend.on('POST', '/api/workers/register', () => new Response(null, { status: 204 }));
    backend.on('GET', '/api/allocations/alloc-1/worker', () => jsonResponse(allocationRow));

    await container.start();
    await flushPromises();
    const incoming: RemoteMessage = {
      messageId: 'msg-1',
      data: { type: 'NewIncident', allocationId: 'alloc-1' },
      notification: { title: 'Nieuw', body: 'A2' },
    };
    received.listener?.(incoming, 'foreground');
    received.listener?.(incoming, 'foreground');
    received.listener?.({ ...incoming, messageId: 'msg-2' }, 'initial');
    await flushPromises();

    expect(backend.callsTo('GET', '/api/allocations/alloc-1/worker')).toHaveLength(2);
    const cached = container.queryClient.getQueryData<readonly { dn_allocationid: string }[]>(
      allocationKeys.list(),
    );
    expect(cached?.map((allocation) => allocation.dn_allocationid)).toEqual(['alloc-1']);
    expect(opened).toEqual(['overview']);
  });

  it('records a push message in the in-app history and clears it on sign-out', async () => {
    const received: {
      listener: ((message: RemoteMessage, source: NotificationSource) => void) | null;
    } = { listener: null };
    const { container, backend } = setup({
      stored: storedSession(),
      pushGateway: {
        ...createDeniedPushGateway(),
        permission: async () => 'granted',
        token: async () => 'ExponentPushToken[device]',
        listen(next) {
          received.listener = next;
          return () => {
            received.listener = null;
          };
        },
      },
    });
    backend.on('POST', '/api/workers/register', () => new Response(null, { status: 204 }));
    backend.on('GET', '/api/allocations/alloc-1/worker', () => jsonResponse(allocationRow));

    await container.start();
    await flushPromises();
    received.listener?.(
      {
        messageId: 'history-1',
        data: { type: 'NewIncident', allocationId: 'alloc-1' },
        notification: { title: 'Nieuw', body: 'A2' },
      },
      'foreground',
    );
    await flushPromises();

    expect(container.notificationHistory.unreadCount()).toBe(1);
    expect(container.notificationHistory.getState().notifications[0]?.id).toBe('history-1');

    await container.authService.signOut();
    await flushPromises();

    expect(container.notificationHistory.unreadCount()).toBe(0);
    expect(container.notificationHistory.getState().notifications).toEqual([]);
  });
});

describe('photo upload queue', () => {
  it('waits for an unfinished photo migration before clearing data on sign-out', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    const files = createInMemoryPhotoFiles({
      'file:///camera/shot.jpg': new Uint8Array([1, 2, 3]),
    });
    const persist = files.persist;
    files.persist = async (sourceUri, photoId) => {
      entered.resolve();
      await release.promise;
      return persist(sourceUri, photoId);
    };
    const { container, keyValueStore, secretStore } = setup({
      stored: storedSession(),
      photoFiles: files,
    });
    await keyValueStore.setItem(
      'photos.queue',
      JSON.stringify([
        {
          id: 'legacy',
          serviceId: 'svc-1',
          incidentId: 'inc-1',
          allocationId: 'alloc-1',
          phase: 'load',
          position: { category: 'DASHBOARD' },
          filePath: 'file:///camera/shot.jpg',
          coordinate: null,
          takenAt: 1,
          status: 'queued',
        },
      ]),
    );

    const starting = container.start();
    await entered.promise;
    const signingOut = container.authService.signOut();
    release.resolve();
    await Promise.all([starting, signingOut]);

    expect(await container.photoService.listByService('svc-1')).toEqual([]);
    expect(secretStore.dump()).toEqual({});
    expect(await keyValueStore.getItem('photos.queue')).toBeNull();
  });

  it('discards legacy photo metadata on sign-out after a failed migration', async () => {
    const files = createInMemoryPhotoFiles();
    files.persist = async () => {
      throw new Error('missing legacy JPEG');
    };
    const { container, keyValueStore, secretStore } = setup({
      stored: storedSession(),
      photoFiles: files,
    });
    await keyValueStore.setItem(
      'photos.queue',
      JSON.stringify([
        {
          id: 'legacy',
          serviceId: 'svc-1',
          incidentId: 'inc-1',
          allocationId: 'alloc-1',
          phase: 'load',
          position: { category: 'DASHBOARD' },
          filePath: '/photos/missing.jpg',
          coordinate: null,
          takenAt: 1,
          status: 'queued',
        },
      ]),
    );

    await container.start();
    await container.authService.signOut();

    expect(await keyValueStore.getItem('photos.queue')).toBeNull();
    expect(secretStore.dump()).toEqual({});
  });

  it('moves legacy photo metadata to secure storage before starting the queue', async () => {
    const { container, keyValueStore, secretStore } = setup({ stored: storedSession() });
    await keyValueStore.setItem(
      'photos.queue',
      JSON.stringify([
        {
          id: 'legacy',
          serviceId: 'svc-1',
          incidentId: 'inc-1',
          allocationId: 'alloc-1',
          phase: 'load',
          position: { category: 'DASHBOARD' },
          filePath: 'file:///camera/shot.jpg',
          coordinate: null,
          takenAt: 1,
          status: 'queued',
        },
      ]),
    );

    await container.start();
    await flushPromises();

    expect(await keyValueStore.getItem('photos.queue')).toBeNull();
    expect(secretStore.dump()['photos.queue']).toBeDefined();
    expect(await container.photoService.listByService('svc-1')).toHaveLength(1);
  });

  it('keeps a photo queued after a temporary failure and sends it on the next drain', async () => {
    const { container, backend, scheduler } = setup({ stored: storedSession() });
    let attempts = 0;
    backend.on('POST', '/api/binary/upload', () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response('offline', { status: 503 });
      }
      return new Response(null, { status: 201 });
    });

    await container.start();
    await flushPromises();

    await container.photoService.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await container.photoService.processNow();

    expect((await container.photoService.listByService('svc-1'))[0]?.status).toBe('queued');
    expect(backend.callsTo('POST', '/api/binary/upload')).toHaveLength(1);

    await scheduler.fireNext();
    await container.photoService.processNow();

    expect(backend.callsTo('POST', '/api/binary/upload')).toHaveLength(2);
    expect((await container.photoService.listByService('svc-1'))[0]?.status).toBe('sent');
  });
});

describe('mutation outbox', () => {
  it('removes only the finished allocation service cache after server confirmation', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.on(
      'PUT',
      '/api/allocations/alloc-1/decline',
      () => new Response(null, { status: 204 }),
    );
    await container.start();
    const allocations = await container.allocationsApi.list();
    container.queryClient.setQueryData(allocationKeys.list(), allocations);
    const incidentId = allocations.find((allocation) => allocation.dn_allocationid === 'alloc-1')
      ?.incident.dn_incidentid;
    expect(incidentId).toBeDefined();
    container.queryClient.setQueryData(['services', incidentId], ['finished-service']);
    container.queryClient.setQueryData(['services', 'other-incident'], ['other-service']);

    expect(await container.allocationActionsService.finish('alloc-1')).toEqual({
      ok: true,
      value: undefined,
    });

    expect(container.queryClient.getQueryData(['services', incidentId])).toBeUndefined();
    expect(container.queryClient.getQueryData(['services', 'other-incident'])).toEqual([
      'other-service',
    ]);
  });

  it('keeps a finish queued after a temporary failure and sends it on the next drain', async () => {
    const { container, backend, scheduler } = setup({ stored: storedSession() });
    let attempts = 0;
    backend.on('PUT', '/api/allocations/alloc-1/decline', () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response('offline', { status: 503 });
      }
      return new Response(null, { status: 204 });
    });

    await container.start();
    await flushPromises();
    await container.photoService.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await container.photoService.processNow();
    await container.serviceFormDrafts.save('alloc-1', 'svc-1', {
      answers: {},
      hideSignature: {},
      noEmailConfirmation: {},
      acceptedTermsAndConditions: false,
      recommendedFieldId: null,
      expandedSections: {},
    });
    await container.outbox.enqueue({ kind: 'finish-allocation', allocationId: 'alloc-1' });
    await container.outbox.processNow();

    expect((await container.outbox.list()).map((item) => item.status)).toEqual(['queued']);
    expect(await container.photoService.listByService('svc-1')).toHaveLength(1);
    expect(await container.serviceFormDrafts.load('alloc-1', 'svc-1')).not.toBeNull();
    expect(backend.callsTo('PUT', '/api/allocations/alloc-1/decline')).toHaveLength(1);

    const decline = () => backend.callsTo('PUT', '/api/allocations/alloc-1/decline');
    for (let step = 0; step < 8 && decline().length < 2; step += 1) {
      await scheduler.fireNext();
      await container.outbox.processNow();
    }

    expect(decline()).toHaveLength(2);
    expect(decline()[1]?.body).toBe('875920014');
    expect(await container.outbox.list()).toEqual([]);
    expect(await container.photoService.listByService('svc-1')).toEqual([]);
    expect(await container.serviceFormDrafts.load('alloc-1', 'svc-1')).toBeNull();
  });

  it('queues a service decline offline and sends it later', async () => {
    const { container, backend, scheduler } = setup({ stored: storedSession() });
    let attempts = 0;
    backend.on('PUT', '/api/services/svc-1/decline', () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response('offline', { status: 503 });
      }
      return new Response(null, { status: 204 });
    });

    await container.start();
    await flushPromises();
    await container.outbox.enqueue({
      kind: 'decline-service',
      serviceId: 'svc-1',
      statuscode: 875920006,
    });
    await container.outbox.processNow();

    expect((await container.outbox.list()).map((item) => item.status)).toEqual(['queued']);

    const decline = () => backend.callsTo('PUT', '/api/services/svc-1/decline');
    for (let step = 0; step < 8 && decline().length < 2; step += 1) {
      await scheduler.fireNext();
      await container.outbox.processNow();
    }

    expect(decline()).toHaveLength(2);
    expect(decline()[1]?.body).toBe('875920006');
    expect(await container.outbox.list()).toEqual([]);
  });
});

describe('service form', () => {
  it('finds the synced form, offers depots nearest first and sends the filled-in form', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    const formDefinition = {
      servicecode: 1004,
      servicename: [{ 'language-code': 1043, value: 'Pechhulp' }],
      definition: [
        {
          phase: 1,
          'phase-name': [{ 'language-code': 1043, value: 'Laden' }],
          tabs: [
            {
              header: [{ 'language-code': 1043, value: 'Algemeen' }],
              fields: [
                {
                  name: 'dn_remarks',
                  type: 'string',
                  label: [{ 'language-code': 1043, value: 'Opmerking' }],
                  autoform: { optional: false },
                },
                {
                  name: '_dn_locationid_value',
                  type: 'select',
                  table: 'dn_location',
                  sortoptions: { orderby: 'distance', direction: 'ascending' },
                  label: [{ 'language-code': 1043, value: 'Depot' }],
                  autoform: { optional: false },
                },
              ],
            },
          ],
        },
      ],
    };
    backend.on('GET', '/api/client-sync/schema/1043', () =>
      jsonResponse(['dn_location', 'dn_servicedefinitions']),
    );
    backend.on('GET', '/api/client-sync/dn_location/1043', () =>
      jsonResponse([
        { dn_name: 'Groningen', dn_locationid: 'loc-far', dn_latitude: 53.2, dn_longitude: 6.5 },
        { dn_name: 'Utrecht', dn_locationid: 'loc-near', dn_latitude: 52.1, dn_longitude: 5.1 },
      ]),
    );
    backend.on('GET', '/api/client-sync/dn_servicedefinitions/1043', () =>
      jsonResponse([{ dataDefinition: [formDefinition] }]),
    );
    backend.on('PUT', '/api/services/svc-1', () => new Response(null, { status: 204 }));

    await container.start();
    await flushPromises();
    const found = await container.serviceFormService.findDefinition(1004);
    const depots = await container.serviceFormService.loadSelectOptions({
      table: 'dn_location',
      sortOptions: { orderby: 'distance', direction: 'ascending' },
    });

    expect(found?.servicecode).toBe(1004);
    expect(depots).toEqual({
      kind: 'options',
      options: [
        { label: 'Utrecht', value: 'loc-near' },
        { label: 'Groningen', value: 'loc-far' },
      ],
    });

    const result = await container.serviceFormService.submit({
      serviceId: 'svc-1',
      statuscode: 875920000,
      body: { statuscode: 875920004, statecode: 0, _dn_locationid_value: 'loc-near' },
    });

    expect(result).toEqual({ kind: 'submitted' });
    const [sent] = backend.callsTo('PUT', '/api/services/svc-1');
    expect(sent?.headers.Authorization).toBe('Bearer access-1');
    expect(JSON.parse(sent?.body ?? '{}')).toEqual({
      statuscode: 875920004,
      statecode: 0,
      _dn_locationid_value: 'loc-near',
    });
  });
});

describe('changing vehicle', () => {
  const validUnit = () =>
    jsonResponse({
      alternateVehicleRegistrationNumber: 'AB-12-CD',
      validUntil: '2026-09-22T20:00:00.000Z',
    });

  async function decideFromList(container: ReturnType<typeof setup>['container']) {
    const sections = createAllocationSections(await container.allocationsApi.list(), []);
    const activeWork = hasActiveAllocations(sections);
    const outcome = await container.allocationUnitService.checkReregister(activeWork);
    return decideChangeVehicle(outcome, activeWork);
  }

  it('lets a berger with only a pending assignment register a new vehicle', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocations', () =>
      jsonResponse([{ ...allocationRow, statuscode: 1 }]),
    );
    backend.on('GET', '/api/allocation-units', validUnit);
    backend.on('PATCH', '/api/allocation-units', () => new Response(null, { status: 204 }));
    await container.start();

    expect(await decideFromList(container)).toEqual({ action: 'register' });

    const result = await container.allocationUnitService.registerExternal({
      plateNumber: 'XY-34-ZZ',
      endDate: new Date(NOW + 8 * 60 * MINUTE),
      availability: DEFAULT_AVAILABILITY,
    });
    expect(result).toEqual({ ok: true, value: undefined });
    expect(backend.callsTo('PATCH', '/api/allocation-units')).toHaveLength(1);
  });

  it('warns instead of registering while an assignment is in progress', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocation-units', validUnit);
    await container.start();

    expect(await decideFromList(container)).toEqual({ action: 'alert', reason: 'active-work' });
    expect(backend.callsTo('PATCH', '/api/allocation-units')).toHaveLength(0);
  });

  it('opens extend-shift when the unit exists but the shift has expired', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocations', () =>
      jsonResponse([{ ...allocationRow, statuscode: 1 }]),
    );
    backend.on('GET', '/api/allocation-units', () =>
      jsonResponse({
        alternateVehicleRegistrationNumber: 'AB-12-CD',
        validUntil: '2026-09-20T20:00:00.000Z',
        notAvailableForIM: false,
      }),
    );
    backend.on('PATCH', '/api/allocation-units', () => new Response(null, { status: 204 }));
    await container.start();

    expect(await decideFromList(container)).toEqual({ action: 'extend-shift' });

    const endDate = new Date(NOW + 8 * 60 * MINUTE);
    const result = await container.allocationUnitService.extendShift(endDate);
    expect(result).toEqual({ ok: true, value: undefined });
    const [sent] = backend.callsTo('PATCH', '/api/allocation-units');
    expect(JSON.parse(sent?.body ?? '{}')).toMatchObject({
      alternateVehicleRegistrationNumber: 'AB-12-CD',
      validUntil: endDate.toISOString(),
    });
  });

  it('sends onboarding to extend-shift when the shift expired without active work', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocations', () =>
      jsonResponse([{ ...allocationRow, statuscode: 1 }]),
    );
    backend.on('GET', '/api/allocation-units', () =>
      jsonResponse({
        alternateVehicleRegistrationNumber: 'AB-12-CD',
        validUntil: '2026-09-20T20:00:00.000Z',
      }),
    );
    await container.start();

    const sections = createAllocationSections(await container.allocationsApi.list(), []);
    const reregister = await container.allocationUnitService.checkReregister(
      hasActiveAllocations(sections),
    );
    expect(
      decideOnboarding({
        reregister,
        userType: 'external',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'extend-shift', notice: 'none' });
  });

  it('recognises ACTIVE_INCIDENT when registration is refused amid open work', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocation-units', () => new Response(null, { status: 404 }));
    backend.on('POST', '/api/allocation-units/externalworker', () =>
      problemResponse(400, { detail: 'ACTIVE_INCIDENT' }),
    );
    await container.start();

    const result = await container.allocationUnitService.registerExternal({
      plateNumber: 'XY-34-ZZ',
      endDate: new Date(NOW + 8 * 60 * MINUTE),
      availability: DEFAULT_AVAILABILITY,
    });
    expect(result).toEqual({ ok: false, error: 'active-incident' });
  });
});

describe('signing out', () => {
  it('refuses while an assignment is in progress and keeps the session', async () => {
    const { container } = setup({ stored: storedSession() });
    await container.start();

    const result = await container.signOutGuard.signOut();

    expect(result).toEqual({ ok: false, error: 'active-work' });
    expect(container.sessionStore.getState().status).toBe('signed-in');
  });

  it('cancels the unit then signs out when only a pending assignment remains', async () => {
    const { container, backend, secretStore } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocations', () =>
      jsonResponse([{ ...allocationRow, statuscode: 1 }]),
    );
    backend.on('GET', '/api/allocation-units', () =>
      jsonResponse({
        id: 'unit-1',
        alternateVehicleRegistrationNumber: 'AB-12-CD',
        validUntil: '2026-09-22T20:00:00.000Z',
      }),
    );
    backend.on(
      'POST',
      '/api/allocation-units/unit-1/cancel',
      () => new Response(null, { status: 204 }),
    );
    await container.start();

    const result = await container.signOutGuard.signOut();

    expect(result).toEqual({ ok: true, value: undefined });
    expect(backend.callsTo('POST', '/api/allocation-units/unit-1/cancel')).toHaveLength(1);
    expect(container.sessionStore.getState().status).toBe('signed-out');
    expect(secretStore.dump()['auth.session']).toBeUndefined();
  });

  it('signs out without cancel when there is no unit', async () => {
    const { container, backend, secretStore } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocations', () =>
      jsonResponse([{ ...allocationRow, statuscode: 1 }]),
    );
    backend.on('GET', '/api/allocation-units', () => new Response(null, { status: 404 }));
    await container.start();

    const result = await container.signOutGuard.signOut();

    expect(result).toEqual({ ok: true, value: undefined });
    expect(container.sessionStore.getState().status).toBe('signed-out');
    expect(secretStore.dump()['auth.session']).toBeUndefined();
  });

  it('keeps the session when cancelling the unit fails', async () => {
    const { container, backend } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocations', () =>
      jsonResponse([{ ...allocationRow, statuscode: 1 }]),
    );
    backend.on('GET', '/api/allocation-units', () =>
      jsonResponse({
        id: 'unit-1',
        alternateVehicleRegistrationNumber: 'AB-12-CD',
        validUntil: '2026-09-22T20:00:00.000Z',
      }),
    );
    backend.on(
      'POST',
      '/api/allocation-units/unit-1/cancel',
      () => new Response(null, { status: 500 }),
    );
    await container.start();

    const result = await container.signOutGuard.signOut();

    expect(result).toEqual({ ok: false, error: 'cancel-failed' });
    expect(container.sessionStore.getState().status).toBe('signed-in');
  });
});

describe('status overlay', () => {
  it('shows processing then success when accepting an assignment', async () => {
    const { container, backend, scheduler } = setup({ stored: storedSession() });
    backend.on('GET', '/api/allocation-units', () =>
      jsonResponse({
        alternateVehicleRegistrationNumber: 'AB-12-CD',
        validUntil: '2026-09-22T20:00:00.000Z',
      }),
    );
    backend.on('PUT', '/api/allocations/alloc-1/accept', () => new Response(null, { status: 204 }));
    await container.start();

    const done = container.statusOverlay.run('Opdracht accepteren…', async () => {
      const result = await container.allocationActionsService.accept('alloc-1', false);
      expect(result).toEqual({ kind: 'accepted' });
      return { tone: 'success', message: 'Opdracht geaccepteerd' };
    });

    expect(container.statusOverlay.store.getState().current).toEqual({
      phase: 'processing',
      message: 'Opdracht accepteren…',
      slow: false,
    });

    await done;

    expect(container.statusOverlay.store.getState().current).toEqual({
      phase: 'success',
      message: 'Opdracht geaccepteerd',
    });

    const dismissTimer = scheduler.pending().find((timer) => timer.delayMs === 1500);
    expect(dismissTimer).toBeDefined();
    dismissTimer?.callback();
    expect(container.statusOverlay.store.getState().current).toBeNull();
  });
});
