import { resolveCurrentPosition, type LocationReader } from '@/domeinen/location';
import { HttpError, isRetryable } from '@/shared/api/errors';
import type { Logger } from '@/shared/logging/logger';
import type { Clock } from '@/shared/platform/ports';
import type { ListServerPhotosInput, PhotosApi, ServerPhotoSummary } from '../api/photos-api';
import { isExtraForUpload } from '../domain/extra';
import { commentForPhase } from '../domain/phase';
import { toImagePosition } from '../domain/photo-type';
import { PHOTO_STATUS, type Photo, type PhotoPhase, type PhotoPosition } from '../domain/types';
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
  position: PhotoPosition;
  sourceUri: string;
};

export type PhotoService = {
  listByService(serviceId: string): Promise<Photo[]>;
  displayUri(filePath: string): Promise<string>;
  listServerPhotos(input: ListServerPhotosInput): Promise<ServerPhotoSummary[]>;
  /** Persists the file and enqueues an upload. Kicks the queue. */
  capture(input: CapturePhotoInput): Promise<Photo>;
  /** Puts a failed photo back on the queue. */
  retry(photoId: string): Promise<void>;
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
 * One list per device: capture stores the file and metadata, the queue uploads in order. A
 * temporary failure keeps the photo queued; a hard 4xx marks it failed without deleting the file.
 */
export function createPhotoService(deps: PhotoServiceDeps): PhotoService {
  const { api, files, repository, locationReader, clock, scheduler, logger } = deps;

  let running = false;
  let draining = false;
  let drainPromise: Promise<void> | null = null;
  let cancelRetry: (() => void) | null = null;
  let retryAttempt = 0;
  let idSequence = 0;

  async function replace(next: readonly Photo[]): Promise<void> {
    await repository.save(next);
  }

  async function withUpdate(mutator: (photos: Photo[]) => Photo[]): Promise<Photo[]> {
    const current = await repository.load();
    const next = mutator(current);
    await replace(next);
    return next;
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
      await api.upload({
        incidentId: withLocation.incidentId,
        serviceId: withLocation.serviceId,
        coordinate: withLocation.coordinate,
        imagePosition: toImagePosition(withLocation.position),
        fileName,
        fileBytes: bytes,
        comment: commentForPhase(withLocation.phase),
        createdDateTime: utcStringFromEpoch(withLocation.takenAt),
        isExtra: isExtraForUpload(withLocation, all),
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
      logger?.warn('photos', 'Photo upload failed temporarily, will retry', {
        photoId: photo.id,
        error,
      });
      return 'retry';
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
      return photos.filter((photo) => photo.serviceId === serviceId);
    },

    displayUri(filePath) {
      return files.displayUri(filePath);
    },

    async listServerPhotos(input) {
      try {
        const photos = await api.list(input);
        await repository.saveServer(input, photos);
        return photos;
      } catch (error) {
        const cached = await repository.loadServer(input);
        if (cached !== null) return cached;
        throw error;
      }
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
        position: input.position,
        filePath,
        coordinate: resolveCurrentPosition(await locationReader.getCurrent()),
        takenAt: clock.now(),
        status: PHOTO_STATUS.queued,
      };
      await withUpdate((photos) => [...photos, photo]);
      kick();
      return photo;
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
