import { z } from 'zod';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Clock, KeyValueStore } from '@/shared/platform/ports';
import type { Logger } from '@/shared/logging/logger';
import {
  addToHistory,
  entryFromParsed,
  isNotificationToken,
  markAllRead,
  markRead,
  unreadCount,
  type StoredNotification,
} from '../domain/history';
import type { ParsedNotification } from '../domain/types';

export const NOTIFICATION_HISTORY_KEY = 'notifications.history';

const storedSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  receivedAt: z.number().int().nonnegative(),
  isRead: z.boolean(),
  type: z.string().nullable(),
  allocationId: z.string().optional(),
  incidentId: z.string().optional(),
});

const listSchema = z.array(storedSchema);

export type NotificationHistoryState = {
  notifications: readonly StoredNotification[];
  hydrated: boolean;
};

export type NotificationHistory = {
  getState(): NotificationHistoryState;
  subscribe(listener: (state: NotificationHistoryState) => void): () => void;
  /** Loads from durable storage. Safe to call more than once. */
  hydrate(): Promise<void>;
  add(notification: ParsedNotification): void;
  markRead(id: string): void;
  markAllRead(): void;
  clear(): Promise<void>;
  unreadCount(): number;
};

function parseStored(raw: unknown): StoredNotification[] {
  const parsed = listSchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    receivedAt: row.receivedAt,
    isRead: row.isRead,
    type: isNotificationToken(row.type) ? row.type : null,
    allocationId: row.allocationId,
    incidentId: row.incidentId,
  }));
}

export type NotificationHistoryDeps = {
  store: KeyValueStore;
  clock: Clock;
  logger?: Logger;
};

/**
 * In-app history of push messages the berger can open later. Vanilla Zustand so the push runtime
 * (no React) and the bell share one store; durable on KeyValueStore, wiped on sign-out.
 */
export function createNotificationHistory(deps: NotificationHistoryDeps): NotificationHistory {
  const { store, clock, logger } = deps;
  const api: StoreApi<NotificationHistoryState> = createStore<NotificationHistoryState>()(() => ({
    notifications: [],
    hydrated: false,
  }));

  let persistGeneration = 0;

  function persist(notifications: readonly StoredNotification[]): void {
    const generation = ++persistGeneration;
    void store
      .setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(notifications))
      .catch((error: unknown) => {
        if (generation === persistGeneration) {
          logger?.warn('notifications', 'Could not save notification history', { error });
        }
      });
  }

  function setNotifications(notifications: readonly StoredNotification[]): void {
    api.setState({ notifications, hydrated: true });
    persist(notifications);
  }

  return {
    getState: () => api.getState(),
    subscribe(listener) {
      return api.subscribe((state) => listener(state));
    },

    async hydrate() {
      try {
        const raw = await store.getItem(NOTIFICATION_HISTORY_KEY);
        if (raw === null || raw === '') {
          api.setState({ notifications: [], hydrated: true });
          return;
        }
        const notifications = parseStored(JSON.parse(raw) as unknown);
        api.setState({ notifications, hydrated: true });
      } catch (error) {
        logger?.warn('notifications', 'Could not load notification history', { error });
        api.setState({ notifications: [], hydrated: true });
      }
    },

    add(notification) {
      const entry = entryFromParsed(notification, clock.now());
      if (entry === null) {
        return;
      }
      const next = addToHistory(api.getState().notifications, entry);
      if (next === api.getState().notifications) {
        return;
      }
      setNotifications(next);
    },

    markRead(id) {
      const current = api.getState().notifications;
      const next = markRead(current, id);
      if (next === current) {
        return;
      }
      setNotifications(next);
    },

    markAllRead() {
      const current = api.getState().notifications;
      const next = markAllRead(current);
      if (next === current) {
        return;
      }
      setNotifications(next);
    },

    async clear() {
      persistGeneration += 1;
      api.setState({ notifications: [], hydrated: true });
      try {
        await store.removeItem(NOTIFICATION_HISTORY_KEY);
      } catch (error) {
        logger?.warn('notifications', 'Could not clear notification history', { error });
      }
    },

    unreadCount() {
      return unreadCount(api.getState().notifications);
    },
  };
}
