import { z } from 'zod';
import type { ListServerPhotosInput, ServerPhotoSummary } from '../api/photos-api';
import type { KeyValueStore } from '@/shared/platform/ports';
import {
  EXTERIOR_ANGLES,
  PHOTO_CATEGORY,
  PHOTO_PHASE,
  PHOTO_STATUS,
  TYRE_POSITIONS,
  type Photo,
  type PhotoPosition,
} from '../domain/types';

const STORE_KEY = 'photos.queue';
const SERVER_KEY = 'photos.server';

const positionSchema = z.union([
  z.object({
    category: z.literal(PHOTO_CATEGORY.EXTERIOR),
    angle: z.enum(EXTERIOR_ANGLES),
  }),
  z.object({
    category: z.literal(PHOTO_CATEGORY.TYRES),
    tyre: z.enum(TYRE_POSITIONS),
  }),
  z.object({
    category: z.enum([
      PHOTO_CATEGORY.OVERVIEW,
      PHOTO_CATEGORY.ROOF,
      PHOTO_CATEGORY.INTERIOR,
      PHOTO_CATEGORY.DASHBOARD,
      PHOTO_CATEGORY.ENGINE,
      PHOTO_CATEGORY.TRAILER,
      PHOTO_CATEGORY.CARGO,
    ]),
  }),
]);

const photoSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  incidentId: z.string(),
  allocationId: z.string(),
  phase: z.enum([PHOTO_PHASE.load, PHOTO_PHASE.delivery]),
  position: positionSchema,
  filePath: z.string(),
  coordinate: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  takenAt: z.number(),
  status: z.enum([PHOTO_STATUS.queued, PHOTO_STATUS.sent, PHOTO_STATUS.failed]),
});

const listSchema = z.array(photoSchema);
const serverEntriesSchema = z.array(
  z.object({
    allocationId: z.string(),
    serviceId: z.string(),
    phase: z.enum([PHOTO_PHASE.load, PHOTO_PHASE.delivery]),
    photos: z.array(
      z.object({
        url: z.string().min(1),
        phase: z.enum([PHOTO_PHASE.load, PHOTO_PHASE.delivery]),
        position: positionSchema,
        isExtra: z.boolean(),
      }),
    ),
  }),
);
type ServerEntry = z.infer<typeof serverEntriesSchema>[number];

export type PhotoRepository = {
  load(): Promise<Photo[]>;
  save(photos: readonly Photo[]): Promise<void>;
  loadServer(input: ListServerPhotosInput): Promise<ServerPhotoSummary[] | null>;
  saveServer(input: ListServerPhotosInput, photos: readonly ServerPhotoSummary[]): Promise<void>;
  clearServerForService(serviceId: string): Promise<void>;
  clearServerForAllocation(allocationId: string): Promise<void>;
  clearServer(): Promise<void>;
};

export function createPhotoRepository(store: KeyValueStore): PhotoRepository {
  let pendingWrite: Promise<void> = Promise.resolve();
  async function readServer(): Promise<ServerEntry[]> {
    try {
      return serverEntriesSchema.parse(JSON.parse((await store.getItem(SERVER_KEY)) ?? '[]'));
    } catch {
      return [];
    }
  }
  function updateServer(change: (entries: ServerEntry[]) => ServerEntry[]): Promise<void> {
    const next = pendingWrite.then(async () => {
      const entries = change(await readServer());
      if (entries.length === 0) await store.removeItem(SERVER_KEY);
      else await store.setItem(SERVER_KEY, JSON.stringify(entries));
    });
    pendingWrite = next.catch(() => undefined);
    return next;
  }
  return {
    async load() {
      const raw = await store.getItem(STORE_KEY);
      if (raw === null || raw === '') {
        return [];
      }
      try {
        const parsed = listSchema.parse(JSON.parse(raw));
        return parsed.map((row) => ({
          ...row,
          position: row.position as PhotoPosition,
        }));
      } catch {
        return [];
      }
    },

    async save(photos) {
      if (photos.length === 0) {
        await store.removeItem(STORE_KEY);
      } else {
        await store.setItem(STORE_KEY, JSON.stringify(photos));
      }
    },
    async loadServer(input) {
      await pendingWrite;
      const entry = (await readServer()).find(
        (item) =>
          item.allocationId === input.allocationId &&
          item.serviceId === input.serviceId &&
          item.phase === input.phase,
      );
      return (entry?.photos as ServerPhotoSummary[] | undefined) ?? null;
    },
    saveServer(input, photos) {
      if (input.allocationId === undefined) return Promise.resolve();
      return updateServer((entries) => [
        ...entries.filter(
          (item) =>
            !(
              item.allocationId === input.allocationId &&
              item.serviceId === input.serviceId &&
              item.phase === input.phase
            ),
        ),
        {
          allocationId: input.allocationId ?? '',
          serviceId: input.serviceId,
          phase: input.phase,
          photos: [...photos],
        },
      ]);
    },
    clearServerForService(serviceId) {
      return updateServer((entries) => entries.filter((item) => item.serviceId !== serviceId));
    },
    clearServerForAllocation(allocationId) {
      return updateServer((entries) =>
        entries.filter((item) => item.allocationId !== allocationId),
      );
    },
    clearServer() {
      return updateServer(() => []);
    },
  };
}
