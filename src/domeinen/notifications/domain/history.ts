import { logicalNotificationKey } from './dedup';
import type { NotificationToken, ParsedNotification } from './types';
import { NOTIFICATION_TOKENS } from './types';

/** Cap matches the old notification-history store. */
export const MAX_STORED_NOTIFICATIONS = 100;

export const NOTIFICATION_FILTER_TAB = {
  all: 'all',
  incidents: 'incidents',
  transport: 'transport',
  status: 'status',
} as const;

export type NotificationFilterTab =
  (typeof NOTIFICATION_FILTER_TAB)[keyof typeof NOTIFICATION_FILTER_TAB];

export const NOTIFICATION_DAY_SECTION = {
  today: 'today',
  yesterday: 'yesterday',
  older: 'older',
} as const;

export type NotificationDaySection =
  (typeof NOTIFICATION_DAY_SECTION)[keyof typeof NOTIFICATION_DAY_SECTION];

/** One row in the in-app notification history. */
export type StoredNotification = {
  id: string;
  title: string;
  body: string;
  /** Epoch milliseconds when the message was received. */
  receivedAt: number;
  isRead: boolean;
  type: NotificationToken | null;
  allocationId?: string;
  incidentId?: string;
};

const INCIDENT_TYPES: ReadonlySet<NotificationToken> = new Set([
  'NewIncident',
  'ChangedIncident',
  'AcceptService',
  'DissolvedIncident',
  'AllocationDissolved',
]);

const TRANSPORT_TYPES: ReadonlySet<NotificationToken> = new Set(['NewTms', 'VehicleDeliverance']);

const STATUS_TYPES: ReadonlySet<NotificationToken> = new Set([
  'WorkerStatus',
  'StandbyLocationAdvice',
]);

const TAB_TYPES: Readonly<
  Record<Exclude<NotificationFilterTab, 'all'>, ReadonlySet<NotificationToken>>
> = {
  incidents: INCIDENT_TYPES,
  transport: TRANSPORT_TYPES,
  status: STATUS_TYPES,
};

/**
 * Durable history id: prefers the logical type+allocation/incident key so two FCM messageIds
 * for the same NewIncident count as one row; falls back to the FCM message id.
 */
export function historyId(notification: ParsedNotification): string | null {
  return logicalNotificationKey(notification) ?? notification.id;
}

/** Builds a history row, or null when the message has no durable id (cannot dedupe). */
export function entryFromParsed(
  notification: ParsedNotification,
  receivedAt: number,
): StoredNotification | null {
  const id = historyId(notification);
  if (id === null) {
    return null;
  }
  return {
    id,
    title: notification.title,
    body: notification.body,
    receivedAt,
    isRead: false,
    type: notification.token,
    allocationId: notification.allocationId,
    incidentId: notification.incidentId,
  };
}

/**
 * Prepends a new entry, ignoring duplicates and capping at {@link MAX_STORED_NOTIFICATIONS}.
 * Newest first.
 */
export function addToHistory(
  current: readonly StoredNotification[],
  entry: StoredNotification,
): readonly StoredNotification[] {
  if (current.some((notification) => notification.id === entry.id)) {
    return current;
  }
  return [entry, ...current].slice(0, MAX_STORED_NOTIFICATIONS);
}

export function markRead(
  current: readonly StoredNotification[],
  id: string,
): readonly StoredNotification[] {
  return current.map((notification) =>
    notification.id === id ? { ...notification, isRead: true } : notification,
  );
}

export function markAllRead(current: readonly StoredNotification[]): readonly StoredNotification[] {
  return current.map((notification) =>
    notification.isRead ? notification : { ...notification, isRead: true },
  );
}

export function unreadCount(current: readonly StoredNotification[]): number {
  return current.filter((notification) => !notification.isRead).length;
}

/** Badge text: exact count, or `99+` past ninety-nine — same as the old bell. */
export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count > 99 ? '99+' : String(count);
}

export function filterByTab(
  current: readonly StoredNotification[],
  tab: NotificationFilterTab,
): readonly StoredNotification[] {
  if (tab === NOTIFICATION_FILTER_TAB.all) {
    return current;
  }
  const allowed = TAB_TYPES[tab];
  return current.filter(
    (notification) => notification.type !== null && allowed.has(notification.type),
  );
}

export function isIncidentNotificationType(type: NotificationToken | null): boolean {
  return type !== null && INCIDENT_TYPES.has(type);
}

function startOfLocalDay(epochMs: number): number {
  const date = new Date(epochMs);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daySectionFor(receivedAt: number, now: number): NotificationDaySection {
  const receivedDay = startOfLocalDay(receivedAt);
  const today = startOfLocalDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  if (receivedDay === today) {
    return NOTIFICATION_DAY_SECTION.today;
  }
  if (receivedDay === yesterday) {
    return NOTIFICATION_DAY_SECTION.yesterday;
  }
  return NOTIFICATION_DAY_SECTION.older;
}

export type NotificationDayGroup = {
  key: NotificationDaySection;
  data: readonly StoredNotification[];
};

/** Groups newest-first notifications into today / yesterday / older. Empty groups are dropped. */
export function groupByDay(
  notifications: readonly StoredNotification[],
  now: number,
): readonly NotificationDayGroup[] {
  const sorted = [...notifications].sort((left, right) => right.receivedAt - left.receivedAt);
  const buckets: Record<NotificationDaySection, StoredNotification[]> = {
    today: [],
    yesterday: [],
    older: [],
  };
  for (const notification of sorted) {
    buckets[daySectionFor(notification.receivedAt, now)].push(notification);
  }
  return (
    [
      NOTIFICATION_DAY_SECTION.today,
      NOTIFICATION_DAY_SECTION.yesterday,
      NOTIFICATION_DAY_SECTION.older,
    ] as const
  )
    .map((key) => ({ key, data: buckets[key] }))
    .filter((group) => group.data.length > 0);
}

const TOKEN_SET: ReadonlySet<string> = new Set(NOTIFICATION_TOKENS);

export function isNotificationToken(value: unknown): value is NotificationToken {
  return typeof value === 'string' && TOKEN_SET.has(value);
}
