import { resolveCurrentPosition, type LocationReader } from '@/domeinen/location';
import { HttpError, isRetryable } from '@/shared/api/errors';
import type { Logger } from '@/shared/logging/logger';
import type { Clock } from '@/shared/platform/ports';
import type { ListServerPhotosInput, PhotosApi, ServerPhotoSummary } from '../api/photos-api';
import { isExtraForUpload } from '../domain/extra';
import { commentForPhase } from '../domain/phase';
import { matchLocalCopies } from '../domain/local-copies';
import { missingPhotoPositions } from '../domain/photo-position-options';
import { toImagePosition } from '../domain/photo-type';
import {
  PHOTO_ROLE,
  PHOTO_STATUS,
  type Photo,
  type PhotoPhase,
  type PhotoPosition,
  type PhotoRole,
} from '../domain/types';
import { utcStringFromEpoch } from '../domain/utc';
import type { PhotoFiles } from './photo-files';
import type { PhotoRepository } from './photo-repository';

/** Same shape as auth's scheduler: schedule work, get a cancel function. */
export type PhotoScheduler = {
  schedule(callback: () => void, delayMs: number): () => void;
};

const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000] as const;

export type CapturePhotoInput = {
  serviceId: string;
  incidentId: string;
  allocationId: string;
  phase: PhotoPhase;
  role?: PhotoRole;
  position: PhotoPosition;
  sourceUri: string;
  overrideExisting?: boolean;
  isExtraOverride?: boolean;
  replacePhotoId?: string;
};

export type PhotoService = {
  listByService(serviceId: string): Promise<Photo[]>;
  displayUri(filePath: string): Promise<string>;
  listServerPhotos(
    input: ListServerPhotosInput,
    localFirstRequirements?: readonly PhotoPosition[],
  ): Promise<ServerPhotoSummary[]>;
  /**
   * Display URI for a server photo without a local copy. Downloads it once and keeps it encrypted
   * until the allocation is cleared; a url outside our API is returned unchanged.
   */
  serverPhotoUri(input: { allocationId: string; url: string }): Promise<string>;
  /** Persists the file as a local draft. */
  capture(input: CapturePhotoInput): Promise<Photo>;
  /**
   * Reads GPS once and stamps every matching draft that still has no coordinate.
   * Returns false when GPS is unavailable and at least one draft still needs a fix.
   */
  attachLocation(input: {
    serviceId: string;
    phase: PhotoPhase;
    photoId?: string;
  }): Promise<boolean>;
  /** Offers every local draft in one service phase to the upload queue. */
  submitBatch(serviceId: string, phase: PhotoPhase): Promise<void>;
  /** Offers exactly one replacement draft to the upload queue. */
  submitOverride(photoId: string): Promise<void>;
  /** Puts a failed photo back on the queue. */
  retry(photoId: string): Promise<void>;
  /** Deletes a local draft or failed photo (not queued/sent). */
  remove(photoId: string): Promise<void>;
  clearForService(serviceId: string): Promise<void>;
  clearForAllocation(allocationId: string): Promise<void>;
  clearAll(): Promise<void>;
  start(): void;
  stop(): void;
  /** Drains once. Exposed for tests. */
  processNow(): Promise<void>;
};

export type PhotoServiceDeps = {
  api: PhotosApi;
  files: PhotoFiles;
  repository: PhotoRepository;
  locationReader: LocationReader;
  clock: Clock;
  scheduler: PhotoScheduler;
  logger?: Logger;
};

export async function migrateLegacyPhotos(
  legacy: PhotoRepository,
  secure: PhotoRepository,
  files: PhotoFiles,
): Promise<void> {
  const oldPhotos = await legacy.load();
  if (oldPhotos.length === 0) {
    return;
  }
  const existing = await secure.load();
  const migrated: Photo[] = [];
  for (const photo of oldPhotos) {
    if (existing.some((item) => item.id === photo.id)) {
      continue;
    }
    const encryptedPath = await files.persist(photo.filePath, photo.id);
    migrated.push({ ...photo, filePath: encryptedPath });
  }
  await secure.save([...existing, ...migrated]);
  await legacy.save([]);
  for (const photo of oldPhotos) {
    await files.remove(photo.filePath);
  }
}

/**
 * One list per device: capture stores a local draft. Explicit submission moves a phase batch onto
 * the upload queue. A temporary failure keeps the photo queued; a hard 4xx marks it failed without
 * deleting the file.
 */
export function createPhotoService(deps: PhotoServiceDeps): PhotoService {
  const { api, files, repository, locationReader, clock, scheduler, logger } = deps;

  let running = false;
  let draining = false;
  let drainPromise: Promise<void> | null = null;
  let cancelRetry: (() => void) | null = null;
  let retryAttempt = 0;
  let idSequence = 0;
  let pendingMutation: Promise<void> = Promise.resolve();
  const pendingDownloads = new Map<string, Promise<string>>();
  const clearedScopes = new Map<string, number>();
  let clearedAll = 0;

  function remoteEpoch(allocationId: string): string {
    return `${clearedAll}:${clearedScopes.get(allocationId) ?? 0}`;
  }

  async function replace(next: readonly Photo[]): Promise<void> {
    await repository.save(next);
  }

  function withUpdate(mutator: (photos: Photo[]) => Photo[]): Promise<Photo[]> {
    const mutation = pendingMutation.then(async () => {
      const current = await repository.load();
      const next = mutator(current);
      await replace(next);
      return next;
    });
    pendingMutation = mutation.then(
      () => undefined,
      () => undefined,
    );
    return mutation;
  }

  function nextId(): string {
    idSequence += 1;
    return `photo-${clock.now()}-${idSequence}`;
  }

  function scheduleRetry(): void {
    if (!running) {
      return;
    }
    cancelRetry?.();
    const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)] ?? 300_000;
    retryAttempt += 1;
    cancelRetry = scheduler.schedule(() => {
      kick();
    }, delay);
  }

  async function ensureCoordinate(photo: Photo): Promise<Photo> {
    if (photo.coordinate !== null) {
      return photo;
    }
    const coordinate = resolveCurrentPosition(await locationReader.getCurrent());
    if (coordinate === null) {
      return photo;
    }
    const updated: Photo = {
      ...photo,
      coordinate,
    };
    await withUpdate((photos) => photos.map((item) => (item.id === photo.id ? updated : item)));
    return updated;
  }

  async function uploadOne(
    photo: Photo,
    all: readonly Photo[],
  ): Promise<'sent' | 'retry' | 'failed'> {
    const withLocation = await ensureCoordinate(photo);
    if (withLocation.coordinate === null) {
      logger?.info('photos', 'Photo waiting for a usable location', { photoId: photo.id });
      return 'retry';
    }

    try {
      const bytes = await files.readBytes(withLocation.filePath);
      const fileName = `${withLocation.id}.jpg`;
      const cachedServerPhotos =
        withLocation.role === PHOTO_ROLE.additional
          ? await repository.loadServer({
              allocationId: withLocation.allocationId,
              incidentId: withLocation.incidentId,
              serviceId: withLocation.serviceId,
              phase: withLocation.phase,
            })
          : null;
      await api.upload({
        incidentId: withLocation.incidentId,
        serviceId: withLocation.serviceId,
        coordinate: withLocation.coordinate,
        imagePosition: toImagePosition(withLocation.position),
        fileName,
        fileBytes: bytes,
        comment: commentForPhase(withLocation.phase),
        createdDateTime: utcStringFromEpoch(withLocation.takenAt),
        isExtra:
          withLocation.isExtraOverride ??
          isExtraForUpload(
            withLocation,
            all,
            cachedServerPhotos?.map((serverPhoto) => serverPhoto.position),
          ),
        overrideExisting: withLocation.overrideExisting === true,
      });
      await withUpdate((photos) =>
        photos.map((item) =>
          item.id === withLocation.id ? { ...item, status: PHOTO_STATUS.sent } : item,
        ),
      );
      return 'sent';
    } catch (error) {
      if (isRetryable(error)) {
        logger?.warn('photos', 'Photo upload failed temporarily, will retry', {
          photoId: photo.id,
          error,
        });
        return 'retry';
      }
      if (error instanceof HttpError) {
        logger?.warn('photos', 'Photo upload rejected, marked failed', {
          photoId: photo.id,
          status: error.status,
          error,
        });
        await withUpdate((photos) =>
          photos.map((item) =>
            item.id === photo.id ? { ...item, status: PHOTO_STATUS.failed } : item,
          ),
        );
        return 'failed';
      }
      logger?.warn('photos', 'Photo upload failed locally, marked failed', {
        photoId: photo.id,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      await withUpdate((photos) =>
        photos.map((item) =>
          item.id === photo.id ? { ...item, status: PHOTO_STATUS.failed } : item,
        ),
      );
      return 'failed';
    }
  }

  async function drain(): Promise<void> {
    if (!running || draining) {
      return;
    }
    draining = true;
    try {
      while (running) {
        const photos = await repository.load();
        const next = photos.find((photo) => photo.status === PHOTO_STATUS.queued);
        if (!next) {
          retryAttempt = 0;
          return;
        }
        const outcome = await uploadOne(next, photos);
        if (outcome === 'retry') {
          scheduleRetry();
          return;
        }
        retryAttempt = 0;
      }
    } finally {
      draining = false;
    }
  }

  function kick(): void {
    if (!running) {
      return;
    }
    cancelRetry?.();
    cancelRetry = null;
    if (drainPromise) {
      return;
    }
    drainPromise = drain().finally(() => {
      drainPromise = null;
    });
  }

  return {
    async listByService(serviceId) {
      const photos = await repository.load();
      const forService = photos.filter((photo) => photo.serviceId === serviceId);
      const missingIds: string[] = [];
      const present: Photo[] = [];
      for (const photo of forService) {
        if (await files.exists(photo.filePath)) {
          present.push(photo);
        } else {
          missingIds.push(photo.id);
        }
      }
      if (missingIds.length > 0) {
        const missing = new Set(missingIds);
        logger?.warn('photos', 'Pruned photo metadata with missing files', {
          serviceId,
          count: missingIds.length,
        });
        await withUpdate((current) => current.filter((photo) => !missing.has(photo.id)));
      }
      return present;
    },

    displayUri(filePath) {
      return files.displayUri(filePath);
    },

    async listServerPhotos(input, localFirstRequirements) {
      const scope = input.allocationId;
      const epoch = scope === undefined ? undefined : remoteEpoch(scope);
      let local: Photo[] = [];
      if (localFirstRequirements !== undefined && scope !== undefined) {
        local = (await this.listByService(input.serviceId)).filter(
          (photo) => photo.phase === input.phase && photo.status !== PHOTO_STATUS.failed,
        );
        const cachedResult = await repository.loadServer(input);
        const cached = cachedResult ?? [];
        const copies = matchLocalCopies(cached, local);
        const available = await Promise.all(
          cached.map(async (photo, index) =>
            copies[index] || (await files.remoteDisplayUri(scope, photo.url)) !== null
              ? photo
              : null,
          ),
        );
        const stored = available.filter((photo) => photo !== null);
        const storedWithoutCopies = stored.filter((photo) => {
          const index = cached.indexOf(photo);
          return copies[index] === null;
        });
        if (
          (local.length > 0 || stored.length > 0 || cachedResult?.length === 0) &&
          missingPhotoPositions(localFirstRequirements, [
            ...local.map((photo) => photo.position),
            ...storedWithoutCopies.map((photo) => photo.position),
          ]).length === 0
        ) {
          return stored;
        }
      }
      let photos: ServerPhotoSummary[];
      try {
        photos = await api.list(input);
        if (scope === undefined || epoch === remoteEpoch(scope)) {
          await repository.saveServer(input, photos);
        }
      } catch (error) {
        const cached = await repository.loadServer(input);
        if (cached === null) throw error;
        photos = cached;
      }
      if (
        localFirstRequirements !== undefined &&
        scope !== undefined &&
        epoch === remoteEpoch(scope)
      ) {
        const copies = matchLocalCopies(photos, local);
        await Promise.allSettled(
          photos
            .filter((_, index) => copies[index] === null)
            .map((photo) => this.serverPhotoUri({ allocationId: scope, url: photo.url })),
        );
      }
      return photos;
    },

    serverPhotoUri({ allocationId, url }) {
      const key = `${allocationId}\n${url}`;
      const pending = pendingDownloads.get(key);
      if (pending) {
        return pending;
      }
      const loading = (async () => {
        const stored = await files.remoteDisplayUri(allocationId, url);
        if (stored !== null) {
          return stored;
        }
        const epoch = remoteEpoch(allocationId);
        const bytes = await api.download(url);
        // A download that outlives "allocation finished" or sign-out must not leave a file behind.
        if (bytes === null || epoch !== remoteEpoch(allocationId)) {
          return url;
        }
        return files.storeRemote(allocationId, url, bytes);
      })().finally(() => {
        pendingDownloads.delete(key);
      });
      pendingDownloads.set(key, loading);
      return loading;
    },

    async capture(input) {
      const id = nextId();
      const filePath = await files.persist(input.sourceUri, id);
      const photo: Photo = {
        id,
        serviceId: input.serviceId,
        incidentId: input.incidentId,
        allocationId: input.allocationId,
        phase: input.phase,
        role: input.role ?? PHOTO_ROLE.mandatory,
        position: input.position,
        filePath,
        // GPS is deferred to submit (`attachLocation`) so the camera stays responsive.
        coordinate: null,
        takenAt: clock.now(),
        status: PHOTO_STATUS.draft,
        overrideExisting: input.overrideExisting === true,
        isExtraOverride: input.isExtraOverride,
      };
      let replacedFilePath: string | null = null;
      await withUpdate((photos) => {
        const replaceable = photos.find(
          (item) =>
            item.id === input.replacePhotoId &&
            item.serviceId === input.serviceId &&
            (item.status === PHOTO_STATUS.draft || item.status === PHOTO_STATUS.failed),
        );
        if (!replaceable) {
          return [...photos, photo];
        }
        replacedFilePath = replaceable.filePath;
        return [...photos.filter((item) => item.id !== replaceable.id), photo];
      });
      if (replacedFilePath !== null) {
        await files.remove(replacedFilePath).catch((error: unknown) => {
          logger?.warn('photos', 'Could not remove replaced photo file', {
            photoId: input.replacePhotoId,
            error,
          });
        });
      }
      return photo;
    },

    async attachLocation(input) {
      const photos = await repository.load();
      const targets = photos.filter((photo) => {
        if (photo.serviceId !== input.serviceId || photo.status !== PHOTO_STATUS.draft) {
          return false;
        }
        if (input.photoId !== undefined) {
          return photo.id === input.photoId;
        }
        return photo.phase === input.phase && photo.overrideExisting !== true;
      });
      const needing = targets.filter((photo) => photo.coordinate === null);
      if (needing.length === 0) {
        return true;
      }
      const coordinate = resolveCurrentPosition(await locationReader.getCurrent());
      if (coordinate === null) {
        logger?.info('photos', 'No usable location while attaching coordinates before submit', {
          serviceId: input.serviceId,
          phase: input.phase,
          photoId: input.photoId,
          needing: needing.length,
        });
        return false;
      }
      const needingIds = new Set(needing.map((photo) => photo.id));
      await withUpdate((current) =>
        current.map((photo) => (needingIds.has(photo.id) ? { ...photo, coordinate } : photo)),
      );
      return true;
    },

    async submitBatch(serviceId, phase) {
      await withUpdate((photos) =>
        photos.map((photo) =>
          photo.serviceId === serviceId &&
          photo.phase === phase &&
          photo.status === PHOTO_STATUS.draft &&
          photo.overrideExisting !== true
            ? { ...photo, status: PHOTO_STATUS.queued }
            : photo,
        ),
      );
      kick();
      if (drainPromise) {
        await drainPromise;
      }
    },

    async submitOverride(photoId) {
      await withUpdate((photos) =>
        photos.map((photo) =>
          photo.id === photoId &&
          photo.status === PHOTO_STATUS.draft &&
          photo.overrideExisting === true
            ? { ...photo, status: PHOTO_STATUS.queued }
            : photo,
        ),
      );
      kick();
      if (drainPromise) {
        await drainPromise;
      }
    },

    async retry(photoId) {
      await withUpdate((photos) =>
        photos.map((photo) =>
          photo.id === photoId && photo.status === PHOTO_STATUS.failed
            ? { ...photo, status: PHOTO_STATUS.queued }
            : photo,
        ),
      );
      kick();
    },

    async remove(photoId) {
      let removedFilePath: string | null = null;
      await withUpdate((photos) => {
        const target = photos.find(
          (photo) =>
            photo.id === photoId &&
            (photo.status === PHOTO_STATUS.draft || photo.status === PHOTO_STATUS.failed),
        );
        if (!target) {
          return photos;
        }
        removedFilePath = target.filePath;
        return photos.filter((photo) => photo.id !== target.id);
      });
      if (removedFilePath !== null) {
        await files.remove(removedFilePath).catch((error: unknown) => {
          logger?.warn('photos', 'Could not remove discarded photo file', {
            photoId,
            error,
          });
        });
      }
    },

    async clearForService(serviceId) {
      const photos = await repository.load();
      const keep: Photo[] = [];
      for (const photo of photos) {
        if (photo.serviceId === serviceId) {
          await files.remove(photo.filePath).catch((error: unknown) => {
            logger?.warn('photos', 'Could not remove photo file', {
              photoId: photo.id,
              error,
            });
          });
        } else {
          keep.push(photo);
        }
      }
      await replace(keep);
      await repository.clearServerForService(serviceId);
    },

    async clearForAllocation(allocationId) {
      const photos = await repository.load();
      const keep: Photo[] = [];
      for (const photo of photos) {
        if (photo.allocationId === allocationId) {
          await files.remove(photo.filePath);
        } else {
          keep.push(photo);
        }
      }
      await replace(keep);
      await repository.clearServerForAllocation(allocationId);
      clearedScopes.set(allocationId, (clearedScopes.get(allocationId) ?? 0) + 1);
      await files.clearRemote(allocationId);
    },

    async clearAll() {
      const photos = await repository.load();
      for (const photo of photos) {
        await files.remove(photo.filePath).catch((error: unknown) => {
          logger?.warn('photos', 'Could not remove photo file', { photoId: photo.id, error });
        });
      }
      await replace([]);
      await repository.clearServer();
      clearedAll += 1;
      await files.clearRemote();
      await files.clearKey();
      cancelRetry?.();
      cancelRetry = null;
    },

    start() {
      running = true;
      kick();
    },

    stop() {
      running = false;
      cancelRetry?.();
      cancelRetry = null;
    },

    async processNow() {
      if (drainPromise) {
        await drainPromise;
        return;
      }
      await drain();
    },
  };
}
