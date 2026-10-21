import type { ParsedNotification } from './types';

export type NotificationDeduplicator = {
  /**
   * True the first time none of the keys have been seen, false when any key is a repeat.
   * An empty key list is always processed (no stable identity). The same push can arrive
   * through several channels (foreground listener, background handler, the notification that
   * opened the app), and the backend may send two FCM messages for one logical event.
   */
  shouldProcess(keys: readonly string[]): boolean;
};

const DEFAULT_CAPACITY = 50;

/** Remembers the last `capacity` keys. Older keys are forgotten first. */
export function createNotificationDeduplicator(
  capacity = DEFAULT_CAPACITY,
): NotificationDeduplicator {
  const seen: string[] = [];

  return {
    shouldProcess(keys) {
      if (keys.length === 0) {
        return true;
      }
      if (keys.some((key) => seen.includes(key))) {
        return false;
      }
      for (const key of keys) {
        seen.push(key);
        if (seen.length > capacity) {
          seen.shift();
        }
      }
      return true;
    },
  };
}

/**
 * Stable identity for one logical push event: type + allocation or incident.
 * Used when the backend sends two FCM messages (different messageIds) for the same incident.
 */
export function logicalNotificationKey(notification: ParsedNotification): string | null {
  if (notification.token === null) {
    return null;
  }
  if (notification.allocationId !== undefined) {
    return `${notification.token}:a:${notification.allocationId}`;
  }
  if (notification.incidentId !== undefined) {
    return `${notification.token}:i:${notification.incidentId}`;
  }
  return null;
}

/**
 * Keys under which this message counts as already handled. Includes the FCM message id and,
 * when present, the logical type+allocation/incident key.
 */
export function notificationDedupKeys(notification: ParsedNotification): readonly string[] {
  const keys: string[] = [];
  if (notification.id !== null) {
    keys.push(`msg:${notification.id}`);
  }
  const logical = logicalNotificationKey(notification);
  if (logical !== null) {
    keys.push(`logic:${logical}`);
  }
  return keys;
}
