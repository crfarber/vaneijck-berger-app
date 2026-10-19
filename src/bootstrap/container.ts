import type { QueryClient } from '@tanstack/react-query';
import type { i18n as I18n } from 'i18next';
import {
  ALLOCATION_ACCEPT_STATUS,
  ALLOCATION_DONE_STATUS,
  allocationKeys,
  createAllocationActionsService,
  createAllocationAcceptFlow,
  createAllocationSections,
  createAllocationsApi,
  createReassignService,
  createServiceActionsService,
  hasActiveAllocations,
  type AllocationActionsService,
  type AllocationAcceptFlow,
  type AllocationsApi,
  type ReassignService,
  type ServiceActionsService,
} from '@/domeinen/allocations';
import {
  createAllocationUnitApi,
  createAllocationUnitService,
  createEndDatePreference,
  createRecentTruckPreference,
  createHomebasePreference,
  createLastUnitPreference,
  type AllocationUnitService,
  type EndDatePreference,
  type HomebasePreference,
  type LastUnitPreference,
  type RecentTruckPreference,
} from '@/domeinen/allocation-unit';
import type { LocationReader } from '@/domeinen/location';
import { createSignaturesApi, type SignaturesApi } from '@/domeinen/signatures';
import { createGooglePlacesClient, type PlacesClient } from '@/domeinen/places';
import { createRdwApi, type RdwApi } from '@/domeinen/rdw';
import {
  createAllocationUnitManagement,
  createLanguageSettings,
  createPermissionDisclosurePreference,
  createSignOutGuard,
  type AllocationUnitManagement,
  type DevicePermissions,
  type LanguageSettings,
  type PermissionDisclosurePreference,
  type SignOutGuard,
} from '@/domeinen/settings';
import {
  createOutboxRepository,
  createOutboxService,
  type MutationOutbox,
  type OutboxCommand,
} from '@/domeinen/outbox';
import {
  createServiceFormApi,
  createServiceFormDraftStore,
  createServiceFormService,
  type ServiceFormDraftStore,
  type ServiceFormService,
} from '@/domeinen/service-form';
import { SERVICE_STATUS } from '@/domeinen/services';
import { supportLogText, type LogShare, type SupportLog } from '@/domeinen/support';
import {
  createNotificationDeduplicator,
  createNotificationHandler,
  createNotificationHistory,
  createPushRegistrationApi,
  createPushRuntime,
  type NotificationHistory,
  type PushGateway,
  type PushNavigation,
  type PushRuntime,
} from '@/domeinen/notifications';
import {
  createStandbyLocationService,
  type StandbyLocationService,
} from '@/domeinen/standby-location';
import {
  createPhotosApi,
  createPhotoRepository,
  migrateLegacyPhotos,
  createPhotoService,
  type PhotoFiles,
  type PhotoService,
} from '@/domeinen/photos';
import {
  createReferenceDataApi,
  createReferenceDataService,
  languageCodeFor,
  type ReferenceDataService,
} from '@/domeinen/reference-data';
import {
  bindSessionStore,
  createAuthService,
  createExternalAuthApi,
  createRefresher,
  createSessionLifecycle,
  createSessionRepository,
  createSessionStore,
  createTokenProvider,
  type AuthService,
  type InternalAuth,
  type Scheduler,
  type SessionLifecycle,
  type SessionStore,
  type TokenProvider,
} from '@/domeinen/auth';
import { createHttpClient, type HttpClient } from '@/shared/api/http-client';
import type { RuntimeConfig } from '@/shared/config/runtime-config';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/i18n/resources';
import { createLogger, type Logger, type LogSink } from '@/shared/logging/logger';
import { createStatusOverlay, type StatusOverlay } from '@/shared/feedback/status-overlay';
import { createToastQueue, type ToastQueue } from '@/shared/feedback/toast-queue';
import {
  noopHaptics,
  realSleep,
  systemClock,
  type Clock,
  type Haptics,
  type KeyValueStore,
  type MultipartUploadFiles,
  type SecretStore,
  type Sleep,
} from '@/shared/platform/ports';
import { createQueryClient } from '@/shared/query/create-query-client';
import { clearQueryCache, loadQueryCache, saveQueryCache } from '@/shared/query/query-cache-store';
import {
  createWorkerApi,
  createWorkerAvailabilityService,
  type WorkerApi,
  type WorkerAvailabilityService,
} from '@/domeinen/worker';
import { collectDebugSnapshot, type DebugSnapshot } from './dev/collect-debug-snapshot';
import { createQueryNotificationActions } from './notification-actions';

/** What the device provides. Everything else is built from it. */
export type ContainerInput = {
  config: RuntimeConfig;
  secretStore: SecretStore;
  /** Non-secret preferences. */
  keyValueStore: KeyValueStore;
  /** The phone's language. A choice made in the settings overrides it at start. */
  language: Language;
  /** Azure AD on the device, or null when it is not configured for this build. */
  internalAuth: InternalAuth | null;
  locationReader: LocationReader;
  /** Optional photo-only location source; defaults to the shared device reader. */
  photoLocationReader?: LocationReader;
  /** Location, notification and camera permission, including the system-settings link. */
  devicePermissions: DevicePermissions;
  /** System share sheet for the redacted support log. */
  logShare: LogShare;
  /** Durable JPEG storage for the photo queue. */
  photoFiles: PhotoFiles;
  multipartUploadFiles: MultipartUploadFiles;
  /** Push delivery. A denied permission is a normal outcome, not a failure. */
  pushGateway: PushGateway;
  /** Opens the allocations overview after a tap. */
  notificationNavigation: PushNavigation;
  fetch?: typeof fetch;
  clock?: Clock;
  sleep?: Sleep;
  scheduler?: Scheduler;
  /** Short vibration on toast tones. Defaults to a noop. */
  haptics?: Haptics;
  logSink?: LogSink;
};

export type Container = {
  config: RuntimeConfig;
  logger: Logger;
  i18n: I18n;
  http: HttpClient;
  queryClient: QueryClient;
  tokenProvider: TokenProvider;
  sessionStore: SessionStore;
  authService: AuthService;
  lifecycle: SessionLifecycle;
  allocationsApi: AllocationsApi;
  allocationActionsService: AllocationActionsService;
  allocationAcceptFlow: AllocationAcceptFlow;
  serviceActionsService: ServiceActionsService;
  reassignService: ReassignService;
  workerApi: WorkerApi;
  workerAvailabilityService: WorkerAvailabilityService;
  endDatePreference: EndDatePreference;
  recentTruckPreference: RecentTruckPreference;
  homebasePreference: HomebasePreference;
  /** Survives sign-out; matched by worker id before reuse. */
  lastUnitPreference: LastUnitPreference;
  allocationUnitService: AllocationUnitService;
  referenceDataService: ReferenceDataService;
  rdwApi: RdwApi;
  placesClient: PlacesClient | null;
  signaturesApi: SignaturesApi;
  serviceFormService: ServiceFormService;
  serviceFormDrafts: ServiceFormDraftStore;
  photoService: PhotoService;
  outbox: MutationOutbox;
  supportLog: SupportLog;
  devicePermissions: DevicePermissions;
  locationReader: LocationReader;
  clock: Clock;
  notificationHistory: NotificationHistory;
  standbyLocation: StandbyLocationService;
  /** Non-blocking result feedback (toasts). */
  feedback: ToastQueue;
  /** Blocking full-screen status for send actions (processing / success / queued / error). */
  statusOverlay: StatusOverlay;
  /** Shared timer port — used by toasts and the status overlay. */
  scheduler: Scheduler;
  /** Short vibration for toast/status outcomes and button taps. */
  haptics: Haptics;
  languageSettings: LanguageSettings;
  /** Which post-login permission disclosures the berger already dismissed. */
  permissionDisclosurePreference: PermissionDisclosurePreference;
  /**
   * Push listen/register. Permission is requested from the disclosure / settings screens; call
   * `start` again after notifications are granted.
   */
  pushRuntime: PushRuntime;
  /** Voluntary sign-out from settings; blocked while an assignment is in progress. */
  signOutGuard: SignOutGuard;
  allocationUnitManagement: AllocationUnitManagement;
  /**
   * Storage, session UI state and query cache for the __DEV__ debug screen.
   * Does not expose SecretStore on the container — only this snapshot.
   */
  loadDebugSnapshot(): Promise<DebugSnapshot>;
  /** Restores the session and starts keeping it fresh. Call once, at app start. */
  start(): Promise<void>;
  stop(): void;
};

/**
 * Experiment form definitions from `docs/diensten/experiment`, in `__DEV__` and in the internal
 * release build (a test build for users who need these definitions). Both conditions must stay
 * literal (`__DEV__`, `process.env.EXPO_PUBLIC_ENVIRONMENT`): Metro inlines them and drops the
 * require from acceptance and production bundles, so those JSON files stay out of the store build.
 * Vitest sets neither, so the container tests keep using synced reference data.
 */
function bundledServiceDefinitions(): readonly unknown[] | undefined {
  if (
    (typeof __DEV__ === 'boolean' && __DEV__) ||
    process.env.EXPO_PUBLIC_ENVIRONMENT === 'internal'
  ) {
    const loaded = require('./dev/experiment-service-definitions') as {
      experimentServiceDefinitions?: readonly unknown[];
      default?: { experimentServiceDefinitions?: readonly unknown[] };
    };
    const definitions =
      loaded.experimentServiceDefinitions ?? loaded.default?.experimentServiceDefinitions;
    if (definitions === undefined) {
      throw new Error('Experiment service definitions did not export a catalog');
    }
    return definitions;
  }
  return undefined;
}

/** Live re-read of the experiment JSON. Metro serves the files from disk; a release build omits this. */
function devBundledDefinitionLoader(): (() => Promise<readonly unknown[]>) | undefined {
  if (typeof __DEV__ === 'boolean' && __DEV__) {
    const loaded = require('./dev/load-experiment-service-definitions') as {
      loadExperimentServiceDefinitionsFromDevServer: () => Promise<readonly unknown[]>;
    };
    return () => loaded.loadExperimentServiceDefinitionsFromDevServer();
  }
  return undefined;
}

const timerScheduler: Scheduler = {
  schedule(callback, delayMs) {
    const id = setTimeout(callback, delayMs);
    return () => clearTimeout(id);
  },
};

/**
 * The composition root: the only place that knows every part and connects them. Nothing else
 * builds services, and nothing reaches for a global. Tests build a container with fakes.
 */
export function createContainer(input: ContainerInput): Container {
  const { config } = input;
  const clock = input.clock ?? systemClock;
  const sleep = input.sleep ?? realSleep;
  const scheduler = input.scheduler ?? timerScheduler;
  const haptics = input.haptics ?? noopHaptics;
  const fetchImpl = input.fetch ?? fetch;
  const feedback = createToastQueue({ scheduler, haptics });
  const statusOverlay = createStatusOverlay({ scheduler, haptics });

  const logger = createLogger({ clock, sink: input.logSink });
  const queryClient = createQueryClient(logger);

  let cacheSaveGeneration = 0;
  let cancelCacheSave: (() => void) | null = null;

  function cancelPendingCacheSave(): void {
    cacheSaveGeneration += 1;
    cancelCacheSave?.();
    cancelCacheSave = null;
  }

  function scheduleCacheSave(): void {
    cancelCacheSave?.();
    const generation = cacheSaveGeneration;
    cancelCacheSave = scheduler.schedule(() => {
      cancelCacheSave = null;
      if (generation !== cacheSaveGeneration) {
        return;
      }
      void saveQueryCache(queryClient, input.keyValueStore);
    }, 500);
  }

  const unsubscribeQueryCache = queryClient.getQueryCache().subscribe(() => {
    scheduleCacheSave();
  });

  // Sign-in calls carry no token, so this client is never asked for one.
  const authHttp = createHttpClient({
    baseUrl: config.apiBaseUrl,
    fetch: fetchImpl,
    getAccessToken: () => Promise.resolve(null),
    refreshAccessToken: () => Promise.reject(new Error('Sign-in requests never refresh a token')),
    logger,
  });

  const external = createExternalAuthApi({
    http: authHttp,
    clock,
    clientId: config.externalClientId,
    logger,
  });

  const tokenProvider = createTokenProvider({
    repository: createSessionRepository(input.secretStore),
    refresh: createRefresher(external, input.internalAuth),
    clock,
    sleep,
    logger,
  });

  const http = createHttpClient({
    baseUrl: config.apiBaseUrl,
    fetch: fetchImpl,
    getAccessToken: () => tokenProvider.getAccessToken(),
    refreshAccessToken: () => tokenProvider.refreshNow(),
    logger,
  });

  const referenceDataService = createReferenceDataService({
    api: createReferenceDataApi({ http }),
    store: input.keyValueStore,
    clock,
    languageCode: languageCodeFor(input.language),
    logger,
  });
  const rdwApi = createRdwApi(http);
  const placesClient =
    config.googlePlacesApiKey !== null
      ? createGooglePlacesClient({ apiKey: config.googlePlacesApiKey, fetch: fetchImpl })
      : null;
  const signaturesApi = createSignaturesApi(http, input.multipartUploadFiles);

  const runReferenceDataSync = (): void => {
    referenceDataService.sync().catch((error: unknown) => {
      logger.warn('sync', 'Reference-data sync failed', { error });
    });
  };

  const runReferenceDataClearAll = (): void => {
    referenceDataService.clearAll().catch((error: unknown) => {
      logger.warn('sync', 'Could not clear reference data on sign-out', { error });
    });
  };

  const endDatePreference = createEndDatePreference(input.keyValueStore);
  const recentTruckPreference = createRecentTruckPreference(input.keyValueStore);
  const homebasePreference = createHomebasePreference(input.keyValueStore);
  const lastUnitPreference = createLastUnitPreference(input.keyValueStore);
  const permissionDisclosurePreference = createPermissionDisclosurePreference({
    store: input.keyValueStore,
    logger,
  });

  const sessionStore = createSessionStore();
  const unbindSessionStore = bindSessionStore(tokenProvider, sessionStore);

  const securePhotoRepository = createPhotoRepository(input.secretStore);
  const photoService = createPhotoService({
    api: createPhotosApi(http, input.multipartUploadFiles, config.apiBaseUrl),
    files: input.photoFiles,
    repository: securePhotoRepository,
    locationReader: input.photoLocationReader ?? input.locationReader,
    clock,
    scheduler,
    logger,
  });

  const serviceFormDrafts = createServiceFormDraftStore(input.keyValueStore, clock);
  let photoMigration: Promise<void> | null = null;

  async function clearLegacyPhotoData(): Promise<void> {
    await input.photoFiles.removeLegacy().catch((error: unknown) => {
      logger.warn('photos', 'Could not remove legacy photo files', { error });
    });
    await createPhotoRepository(input.keyValueStore).save([]);
  }

  function startPhotosAfterMigration(): void {
    photoMigration = migrateLegacyPhotos(
      createPhotoRepository(input.keyValueStore),
      securePhotoRepository,
      input.photoFiles,
    )
      .then(() => {
        return input.photoFiles.removeLegacy();
      })
      .then(() => {
        if (tokenProvider.getStatus() === 'signed-in') {
          photoService.start();
        }
      })
      .catch((error: unknown) => {
        logger.warn('photos', 'Legacy photo migration failed', { error });
      });
  }

  const allocationsApi = createAllocationsApi(http, logger);

  async function cleanupFinishedAllocation(allocationId: string): Promise<void> {
    const allocations = queryClient.getQueryData<Awaited<ReturnType<AllocationsApi['list']>>>(
      allocationKeys.list(),
    );
    const incidentId = allocations?.find(
      (allocation) => allocation.dn_allocationid === allocationId,
    )?.incident.dn_incidentid;
    await photoService.clearForAllocation(allocationId);
    await serviceFormDrafts.clearForAllocation(allocationId);
    if (incidentId !== undefined) {
      queryClient.removeQueries({ queryKey: ['services', incidentId], exact: true });
    }
  }

  async function sendOutbox(command: OutboxCommand): Promise<void> {
    switch (command.kind) {
      case 'finish-allocation':
        await allocationsApi.decline(command.allocationId, ALLOCATION_DONE_STATUS);
        await cleanupFinishedAllocation(command.allocationId).catch((error: unknown) => {
          logger.warn('app', 'Finished allocation cleanup failed', { error });
        });
        return;
      case 'decline-allocation':
        await allocationsApi.decline(command.allocationId, command.statuscode);
        return;
      case 'accept-allocation':
        await allocationsApi.accept(command.allocationId, ALLOCATION_ACCEPT_STATUS);
        return;
      case 'accept-service':
        await allocationsApi.acceptService(command.serviceId, SERVICE_STATUS.IN_UITVOERING);
        return;
      case 'decline-service':
        await allocationsApi.declineService(command.serviceId, command.statuscode);
        return;
    }
  }

  const outbox = createOutboxService({
    repository: createOutboxRepository(input.keyValueStore),
    send: sendOutbox,
    clock,
    scheduler,
    logger,
    onSent() {
      void queryClient.invalidateQueries({ queryKey: allocationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const supportLog: SupportLog = {
    text: () => supportLogText(logger.entries(), clock.now()),
    share: () => input.logShare.share(supportLogText(logger.entries(), clock.now())),
  };

  const notificationHistory = createNotificationHistory({
    store: input.keyValueStore,
    clock,
    logger,
  });
  const standbyLocation = createStandbyLocationService({
    store: input.keyValueStore,
    clock,
    logger,
  });

  const authService = createAuthService({
    provider: tokenProvider,
    external,
    internal: input.internalAuth,
    // Data of the previous user must not be visible to the next one. Only the language choice
    // survives logout (open question 12).
    onSignedOut: async () => {
      cancelPendingCacheSave();
      queryClient.clear();
      await clearQueryCache(input.keyValueStore);
      photoService.stop();
      await photoMigration;
      photoService.stop();
      await photoService.clearAll();
      await clearLegacyPhotoData();
      outbox.stop();
      await outbox.clearAll();
      await serviceFormDrafts.clearAll();
      await notificationHistory.clear();
      await standbyLocation.clear();
      await permissionDisclosurePreference.clear();
      await endDatePreference.clear();
      await homebasePreference.clear();
      await recentTruckPreference.clear();
      await referenceDataService.clearAll();
    },
    logger,
  });

  // A session that ends by itself (refresh token refused) also clears user data. A session that
  // starts or was already there at launch kicks off a reference-data sync in the background.
  const unsubscribeSessionEvents = tokenProvider.subscribe((event) => {
    if (event.type === 'signed-out' && event.reason === 'expired') {
      cancelPendingCacheSave();
      queryClient.clear();
      void clearQueryCache(input.keyValueStore);
      runReferenceDataClearAll();
      photoService.stop();
      void (async () => {
        await photoMigration;
        photoService.stop();
        await photoService.clearAll();
        await clearLegacyPhotoData();
      })();
      outbox.stop();
      void outbox.clearAll();
      void serviceFormDrafts.clearAll();
      void notificationHistory.clear();
      void standbyLocation.clear();
      void permissionDisclosurePreference.clear();
      void endDatePreference.clear();
      void homebasePreference.clear();
      void recentTruckPreference.clear();
    }
    if (event.type === 'signed-in' || (event.type === 'restored' && event.userType !== null)) {
      runReferenceDataSync();
      startPhotosAfterMigration();
      outbox.start();
      void notificationHistory.hydrate();
      void standbyLocation.hydrate();
    }
    if (event.type === 'signed-out') {
      photoService.stop();
      outbox.stop();
    }
  });

  const lifecycle = createSessionLifecycle({
    provider: tokenProvider,
    scheduler,
    clock,
    logger,
  });

  const workerApi = createWorkerApi(http);
  const workerAvailabilityService = createWorkerAvailabilityService({
    api: workerApi,
    referenceDataService,
    logger,
  });
  const i18n = createI18n(input.language);
  const languageSettings = createLanguageSettings({
    store: input.keyValueStore,
    apply: (language) => i18n.changeLanguage(language),
    logger,
  });
  const pushRuntime = createPushRuntime({
    gateway: input.pushGateway,
    register: (token) => createPushRegistrationApi(http).register(token),
    handler: createNotificationHandler(
      createQueryNotificationActions({
        queryClient,
        allocations: allocationsApi,
        standbyLocation,
      }),
      logger,
    ),
    deduplicator: createNotificationDeduplicator(),
    navigation: input.notificationNavigation,
    channelName: () => i18n.t('notifications.channelName'),
    bannerFallback: () => ({
      title: i18n.t('notifications.bannerTitle'),
      body: i18n.t('notifications.bannerBody'),
    }),
    history: notificationHistory,
    logger,
  });
  // Same moments as the reference-data sync: a session starts (or was already there), and it ends.
  const unsubscribePush = tokenProvider.subscribe((event) => {
    if (event.type === 'signed-out') {
      pushRuntime.stop();
    }
    if (event.type === 'signed-in' || (event.type === 'restored' && event.userType !== null)) {
      void pushRuntime.start();
    }
  });

  const allocationUnitService = createAllocationUnitService({
    api: createAllocationUnitApi(http),
    referenceDataService,
    clock,
    hasActiveWork: async () =>
      hasActiveAllocations(createAllocationSections(await allocationsApi.list(), [])),
    logger,
  });
  const allocationActionsService = createAllocationActionsService({
    api: allocationsApi,
    allocationUnitService,
    referenceDataService,
    outbox,
    onFinished: cleanupFinishedAllocation,
    logger,
  });
  const allocationAcceptFlow = createAllocationAcceptFlow({
    actionsService: allocationActionsService,
    canStart: () => sessionStore.getState().status === 'signed-in',
    loadAllocations: () =>
      queryClient.fetchQuery({
        queryKey: allocationKeys.list(),
        queryFn: ({ signal }) => allocationsApi.list({ signal }),
        staleTime: 0,
      }),
  });
  const unsubscribeAcceptFlowSession = sessionStore.subscribe((state, previous) => {
    if (state.status !== 'signed-in' || state.userType !== previous.userType) {
      allocationAcceptFlow.getState().cancel();
    }
  });
  const hasActiveWork = async (): Promise<boolean> => {
    let allocations: Awaited<ReturnType<AllocationsApi['list']>> | undefined;
    try {
      allocations = await allocationsApi.list();
    } catch {
      allocations = queryClient.getQueryData(allocationKeys.list());
    }
    if (allocations === undefined) {
      return false;
    }
    return hasActiveAllocations(createAllocationSections(allocations, []));
  };
  const signOutGuard = createSignOutGuard({
    hasActiveWork,
    cancelCurrentUnit: () => allocationUnitService.cancelCurrentUnit(),
    signOut: () => authService.signOut(),
  });
  const allocationUnitManagement = createAllocationUnitManagement({
    hasActiveWork,
    cancelCurrentUnit: () => allocationUnitService.cancelCurrentUnit(),
  });

  return {
    config,
    logger,
    i18n,
    http,
    queryClient,
    tokenProvider,
    sessionStore,
    authService,
    lifecycle,
    allocationsApi,
    allocationActionsService,
    allocationAcceptFlow,
    serviceActionsService: createServiceActionsService({
      api: allocationsApi,
      locationReader: input.locationReader,
      outbox,
      logger,
    }),
    reassignService: createReassignService({ api: allocationsApi, referenceDataService, logger }),
    workerApi,
    workerAvailabilityService,
    endDatePreference,
    recentTruckPreference,
    homebasePreference,
    lastUnitPreference,
    allocationUnitService,
    referenceDataService,
    rdwApi,
    placesClient,
    signaturesApi,
    serviceFormService: createServiceFormService({
      api: createServiceFormApi(http),
      referenceData: referenceDataService,
      locationReader: input.locationReader,
      logger,
      bundledDefinitions: bundledServiceDefinitions(),
      bundledDefinitionLoader: devBundledDefinitionLoader(),
    }),
    serviceFormDrafts,
    photoService,
    outbox,
    supportLog,
    devicePermissions: input.devicePermissions,
    locationReader: input.locationReader,
    clock,
    notificationHistory,
    standbyLocation,
    feedback,
    statusOverlay,
    scheduler,
    haptics,
    languageSettings,
    permissionDisclosurePreference,
    pushRuntime,
    signOutGuard,
    allocationUnitManagement,

    loadDebugSnapshot: () =>
      collectDebugSnapshot({
        secretStore: input.secretStore,
        keyValueStore: input.keyValueStore,
        sessionStore,
        tokenProvider,
        queryClient,
      }),

    async start() {
      // Before the session is known, so the first screen after the splash is already right.
      await languageSettings.restore();
      lifecycle.start();
      try {
        await tokenProvider.restore();
      } catch (error) {
        // Secure storage could not be read. Do not leave the app on a blank screen: show login.
        logger.error('auth', 'Could not restore the session', { error });
        sessionStore.setState({ status: 'signed-out', userType: null, signedOutReason: null });
      }
      if (tokenProvider.getStatus() === 'signed-in') {
        await photoMigration;
        await loadQueryCache(queryClient, input.keyValueStore);
      } else {
        await clearLegacyPhotoData();
      }
    },

    stop() {
      lifecycle.stop();
      pushRuntime.stop();
      photoService.stop();
      outbox.stop();
      cancelPendingCacheSave();
      allocationAcceptFlow.getState().cancel();
      unsubscribeAcceptFlowSession();
      unbindSessionStore();
      unsubscribeSessionEvents();
      unsubscribePush();
      unsubscribeQueryCache();
    },
  };
}
