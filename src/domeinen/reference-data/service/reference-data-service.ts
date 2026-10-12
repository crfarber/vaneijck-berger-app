import type { Logger } from '@/shared/logging/logger';
import type { Clock, KeyValueStore } from '@/shared/platform/ports';
import type { ReferenceDataApi } from '../api/reference-data-api';
import {
  entityMetaFromRecord,
  nextEditedEntityRecord,
  nextEntityRecord,
  parseStoredEntity,
  serializeEntityRecord,
  type EntityMeta,
} from '../domain/entity-record';
import {
  isSyncComplete,
  parseStoredPending,
  withoutEntity,
  type PendingSync,
} from '../domain/sync-state';

const SINCE_KEY = 'referenceData.since';
const PENDING_KEY = 'referenceData.pending';
const ENTITIES_KEY = 'referenceData.entities';
const entityKey = (name: string): string => `referenceData.entity.${name}`;

function parseEntityNames(raw: string | null): string[] | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((name): name is string => typeof name === 'string')
      : [];
  } catch {
    return [];
  }
}

export type SyncResult = {
  /** Entities this call fetched successfully. */
  synced: readonly string[];
  /** Entities that failed this call and remain queued for the next one. */
  failed: readonly string[];
};

export type ReferenceDataTopicStatus = {
  name: string;
  phase: 'pending' | 'syncing' | 'succeeded' | 'failed';
};

export type ReferenceDataSyncStatus = {
  phase: 'idle' | 'syncing' | 'succeeded' | 'failed';
  synced: readonly string[];
  failed: readonly string[];
  topics: readonly ReferenceDataTopicStatus[];
};

export type ReferenceDataService = {
  /**
   * Fetches what changed since the last successful sync (everything, on the first run). A batch
   * only commits its new "since" date once every entity in it has synced; an interrupted or
   * partly failed run resumes from exactly where it left off on the next call, without asking the
   * server again. A failed entity keeps its last synced value.
   */
  sync(): Promise<SyncResult>;
  /** The current or most recently completed sync, for the settings status screen. */
  getSyncStatus(): ReferenceDataSyncStatus;
  /** Notifies the settings status screen about sync progress and outcomes. */
  subscribeToSyncStatus(listener: (status: ReferenceDataSyncStatus) => void): () => void;
  /** The last synced value for an entity, or null when it has never synced. */
  getEntity(name: string): Promise<unknown[] | null>;
  /** Replaces a locally stored entity payload without marking it as newly downloaded. */
  replaceEntityData(name: string, data: unknown[]): Promise<void>;
  /**
   * When the entity was last downloaded and when its local payload last actually changed. Null when
   * the entity has never synced; timestamps themselves may be null for legacy bare-array storage.
   */
  getEntityMeta(name: string): Promise<EntityMeta | null>;
  /**
   * Every entity that has synced at least once. Used when looking up data by content rather than by
   * a fixed name (e.g. form definitions with `dataDefinition`).
   */
  listEntities(): Promise<string[]>;
  /**
   * Fetches one entity again and replaces its local value. Does not ask the schema and does not
   * move the since date — for a manual retry from the settings status screen.
   */
  refreshEntity(name: string): Promise<void>;
  /**
   * Drops an unfinished batch so it is not resumed. Keeps the committed since date and entity
   * values. Prefer `clearAll` on sign-out.
   */
  abortPending(): Promise<void>;
  /**
   * Forgets the sync progress, so the next `sync()` asks the server for everything again. Used when
   * a consumer needs a full refresh (e.g. a missing form definition). Keeps entity values.
   */
  reset(): Promise<void>;
  /**
   * Removes since, pending, the entity list and every stored entity. Call on sign-out so the next
   * login starts a full sync with no previous user's data.
   */
  clearAll(): Promise<void>;
};

export type ReferenceDataServiceDeps = {
  api: ReferenceDataApi;
  store: KeyValueStore;
  clock: Clock;
  languageCode: number;
  logger?: Logger;
};

export function createReferenceDataService(deps: ReferenceDataServiceDeps): ReferenceDataService {
  const { api, store, clock, languageCode, logger } = deps;
  let syncStatus: ReferenceDataSyncStatus = { phase: 'idle', synced: [], failed: [], topics: [] };
  const syncStatusListeners = new Set<(status: ReferenceDataSyncStatus) => void>();

  function setSyncStatus(status: ReferenceDataSyncStatus): void {
    syncStatus = status;
    for (const listener of syncStatusListeners) {
      listener(status);
    }
  }

  function setTopics(names: readonly string[]): void {
    setSyncStatus({
      ...syncStatus,
      topics: names.map((name) => ({ name, phase: 'pending' })),
    });
  }

  function setTopicPhase(name: string, phase: ReferenceDataTopicStatus['phase']): void {
    setSyncStatus({
      ...syncStatus,
      topics: syncStatus.topics.map((topic) => (topic.name === name ? { ...topic, phase } : topic)),
    });
  }

  async function savePending(pending: PendingSync): Promise<void> {
    await store.setItem(PENDING_KEY, JSON.stringify(pending));
  }

  async function commit(since: string): Promise<void> {
    await store.removeItem(PENDING_KEY);
    await store.setItem(SINCE_KEY, since);
  }

  async function rememberEntity(name: string): Promise<void> {
    const names = parseEntityNames(await store.getItem(ENTITIES_KEY)) ?? [];
    if (!names.includes(name)) {
      await store.setItem(ENTITIES_KEY, JSON.stringify([...names, name]));
    }
  }

  async function writeEntity(name: string, data: unknown[]): Promise<void> {
    const previous = parseStoredEntity(await store.getItem(entityKey(name)));
    const record = nextEntityRecord(data, previous, new Date(clock.now()).toISOString());
    await store.setItem(entityKey(name), serializeEntityRecord(record));
    await rememberEntity(name);
  }

  async function runBatch(initial: PendingSync): Promise<SyncResult> {
    const synced: string[] = [];
    const failed: string[] = [];
    let remaining = initial;

    for (const name of initial.entities) {
      setTopicPhase(name, 'syncing');
      try {
        const data = await api.fetchEntity(name, languageCode);
        await writeEntity(name, data);
        remaining = withoutEntity(remaining, name);
        await savePending(remaining);
        synced.push(name);
        setTopicPhase(name, 'succeeded');
      } catch (error) {
        logger?.warn('sync', 'Reference-data entity sync failed, kept for the next attempt', {
          name,
          error,
        });
        failed.push(name);
        setTopicPhase(name, 'failed');
      }
    }

    if (isSyncComplete(remaining)) {
      await commit(remaining.since);
    }
    return { synced, failed };
  }

  return {
    async sync() {
      setSyncStatus({ phase: 'syncing', synced: [], failed: [], topics: [] });
      try {
        const existingPending = parseStoredPending(await store.getItem(PENDING_KEY));
        let result: SyncResult;
        if (existingPending !== null) {
          logger?.info('sync', 'Resuming an interrupted reference-data sync', {
            remaining: existingPending.entities.length,
          });
          setTopics(existingPending.entities);
          result = await runBatch(existingPending);
        } else {
          // A since date without the entity list comes from a version that did not keep the list:
          // only a full sync can tell which entities are on the device.
          const hasEntityList = (await store.getItem(ENTITIES_KEY)) !== null;
          const since = hasEntityList ? ((await store.getItem(SINCE_KEY)) ?? undefined) : undefined;
          const entities = await api.fetchSchema(languageCode, since);
          if (entities.length === 0) {
            result = { synced: [], failed: [] };
          } else {
            const pending: PendingSync = { since: new Date(clock.now()).toISOString(), entities };
            await savePending(pending);
            logger?.info('sync', 'Starting reference-data sync', { total: entities.length });
            setTopics(entities);
            result = await runBatch(pending);
          }
        }

        setSyncStatus({
          phase: result.failed.length === 0 ? 'succeeded' : 'failed',
          synced: result.synced,
          failed: result.failed,
          topics: syncStatus.topics,
        });
        return result;
      } catch (error) {
        setSyncStatus({ ...syncStatus, phase: 'failed' });
        throw error;
      }
    },

    getSyncStatus() {
      return syncStatus;
    },

    subscribeToSyncStatus(listener) {
      syncStatusListeners.add(listener);
      return () => syncStatusListeners.delete(listener);
    },

    async getEntity(name) {
      return parseStoredEntity(await store.getItem(entityKey(name)))?.data ?? null;
    },

    async replaceEntityData(name, data) {
      const previous = parseStoredEntity(await store.getItem(entityKey(name)));
      const record = nextEditedEntityRecord(data, previous, new Date(clock.now()).toISOString());
      await store.setItem(entityKey(name), serializeEntityRecord(record));
      await rememberEntity(name);
    },

    async getEntityMeta(name) {
      const record = parseStoredEntity(await store.getItem(entityKey(name)));
      return record === null ? null : entityMetaFromRecord(record);
    },

    async listEntities() {
      return parseEntityNames(await store.getItem(ENTITIES_KEY)) ?? [];
    },

    async refreshEntity(name) {
      const topics = syncStatus.topics.some((topic) => topic.name === name)
        ? syncStatus.topics
        : [...syncStatus.topics, { name, phase: 'pending' as const }];
      setSyncStatus({
        phase: 'syncing',
        synced: [],
        failed: [],
        topics: topics.map((topic) =>
          topic.name === name ? { ...topic, phase: 'syncing' } : topic,
        ),
      });
      try {
        const data = await api.fetchEntity(name, languageCode);
        await writeEntity(name, data);
        setSyncStatus({
          phase: 'succeeded',
          synced: [name],
          failed: [],
          topics: syncStatus.topics.map((topic) =>
            topic.name === name ? { ...topic, phase: 'succeeded' } : topic,
          ),
        });
      } catch (error) {
        logger?.warn('sync', 'Reference-data entity refresh failed', { name, error });
        setSyncStatus({
          phase: 'failed',
          synced: [],
          failed: [name],
          topics: syncStatus.topics.map((topic) =>
            topic.name === name ? { ...topic, phase: 'failed' } : topic,
          ),
        });
        throw error;
      }
    },

    async abortPending() {
      await store.removeItem(PENDING_KEY);
    },

    async reset() {
      await store.removeItem(SINCE_KEY);
      await store.removeItem(PENDING_KEY);
    },

    async clearAll() {
      const names = parseEntityNames(await store.getItem(ENTITIES_KEY)) ?? [];
      for (const name of names) {
        await store.removeItem(entityKey(name));
      }
      await store.removeItem(ENTITIES_KEY);
      await store.removeItem(SINCE_KEY);
      await store.removeItem(PENDING_KEY);
      setSyncStatus({ phase: 'idle', synced: [], failed: [], topics: [] });
    },
  };
}
