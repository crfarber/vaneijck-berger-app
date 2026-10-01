export type NotificationDeduplicator = {
  /**
   * True the first time an id is seen, false for a repeat. A message without an id is always
   * processed. The same push can arrive through several channels (foreground listener,
   * background handler, the notification that opened the app).
   */
  shouldProcess(id: string | null): boolean;
};

const DEFAULT_CAPACITY = 50;

/** Remembers the last `capacity` ids. Older ids are forgotten first. */
export function createNotificationDeduplicator(
  capacity = DEFAULT_CAPACITY,
): NotificationDeduplicator {
  const seen: string[] = [];

  return {
    shouldProcess(id) {
      if (id === null) {
        return true;
      }
      if (seen.includes(id)) {
        return false;
      }
      seen.push(id);
      if (seen.length > capacity) {
        seen.shift();
      }
      return true;
    },
  };
}
