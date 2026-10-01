import { describe, expect, it } from 'vitest';
import { createFakeClock, createInMemoryStore } from '@/test/fakes';
import type { ParsedNotification } from '../domain/types';
import { createNotificationHistory, NOTIFICATION_HISTORY_KEY } from './notification-history';

function message(overrides: Partial<ParsedNotification> = {}): ParsedNotification {
  return {
    id: 'msg-1',
    token: 'NewIncident',
    hasExplicitType: true,
    allocationId: 'alloc-1',
    title: 'Nieuw',
    body: 'A2',
    ...overrides,
  };
}

describe('createNotificationHistory', () => {
  it('stores a message, dedupes, and survives a reload from storage', async () => {
    const store = createInMemoryStore();
    const clock = createFakeClock(1_000);
    const history = createNotificationHistory({ store, clock });

    history.add(message());
    history.add(message());
    expect(history.unreadCount()).toBe(1);
    expect(history.getState().notifications).toHaveLength(1);

    const reloaded = createNotificationHistory({ store, clock });
    await reloaded.hydrate();
    expect(reloaded.getState().notifications).toEqual(history.getState().notifications);
    expect(await store.getItem(NOTIFICATION_HISTORY_KEY)).not.toBeNull();
  });

  it('marks read and clears durable state', async () => {
    const store = createInMemoryStore();
    const clock = createFakeClock(1_000);
    const history = createNotificationHistory({ store, clock });
    history.add(message());
    history.markRead('msg-1');
    expect(history.unreadCount()).toBe(0);

    history.add(message({ id: 'msg-2' }));
    history.markAllRead();
    expect(history.unreadCount()).toBe(0);

    await history.clear();
    expect(history.getState().notifications).toEqual([]);
    expect(await store.getItem(NOTIFICATION_HISTORY_KEY)).toBeNull();
  });

  it('skips a message without an id', () => {
    const history = createNotificationHistory({
      store: createInMemoryStore(),
      clock: createFakeClock(),
    });
    history.add(message({ id: null }));
    expect(history.getState().notifications).toEqual([]);
  });
});
