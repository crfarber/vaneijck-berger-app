import { describe, expect, it } from 'vitest';
import type { ParsedNotification } from './types';
import {
  addToHistory,
  daySectionFor,
  entryFromParsed,
  filterByTab,
  formatUnreadBadge,
  groupByDay,
  historyId,
  isIncidentNotificationType,
  markAllRead,
  markRead,
  MAX_STORED_NOTIFICATIONS,
  NOTIFICATION_DAY_SECTION,
  NOTIFICATION_FILTER_TAB,
  unreadCount,
  type StoredNotification,
} from './history';

const NOW = Date.UTC(2026, 8, 23, 14, 0, 0);

function parsed(overrides: Partial<ParsedNotification> = {}): ParsedNotification {
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

function stored(overrides: Partial<StoredNotification> = {}): StoredNotification {
  return {
    id: 'msg-1',
    title: 'Nieuw',
    body: 'A2',
    receivedAt: NOW,
    isRead: false,
    type: 'NewIncident',
    allocationId: 'alloc-1',
    ...overrides,
  };
}

describe('historyId / entryFromParsed', () => {
  it('uses the message id and refuses to invent one when missing', () => {
    expect(historyId(parsed())).toBe('msg-1');
    expect(entryFromParsed(parsed({ id: null }), NOW)).toBeNull();
  });

  it('builds an unread row from a parsed message', () => {
    expect(entryFromParsed(parsed(), NOW)).toEqual(stored());
  });
});

describe('addToHistory', () => {
  it('prepends, ignores duplicates and caps at 100', () => {
    const first = stored({ id: 'a' });
    const second = stored({ id: 'b', receivedAt: NOW + 1 });
    expect(addToHistory([first], second)).toEqual([second, first]);
    expect(addToHistory([first], first)).toEqual([first]);

    const many = Array.from({ length: MAX_STORED_NOTIFICATIONS }, (_, index) =>
      stored({ id: `id-${index}` }),
    );
    const next = addToHistory(many, stored({ id: 'new' }));
    expect(next).toHaveLength(MAX_STORED_NOTIFICATIONS);
    expect(next[0]?.id).toBe('new');
    expect(next.some((row) => row.id === 'id-99')).toBe(false);
  });
});

describe('markRead / unreadCount / formatUnreadBadge', () => {
  it('marks one or all as read and formats the badge like the old bell', () => {
    const list = [stored({ id: 'a' }), stored({ id: 'b', isRead: true })];
    expect(unreadCount(list)).toBe(1);
    expect(unreadCount(markRead(list, 'a'))).toBe(0);
    expect(unreadCount(markAllRead(list))).toBe(0);
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(3)).toBe('3');
    expect(formatUnreadBadge(100)).toBe('99+');
  });
});

describe('filterByTab', () => {
  it('keeps only the types that belong to the tab', () => {
    const list = [
      stored({ id: '1', type: 'NewIncident' }),
      stored({ id: '2', type: 'NewTms' }),
      stored({ id: '3', type: 'WorkerStatus' }),
    ];
    expect(filterByTab(list, NOTIFICATION_FILTER_TAB.incidents).map((row) => row.id)).toEqual([
      '1',
    ]);
    expect(filterByTab(list, NOTIFICATION_FILTER_TAB.transport).map((row) => row.id)).toEqual([
      '2',
    ]);
    expect(filterByTab(list, NOTIFICATION_FILTER_TAB.status).map((row) => row.id)).toEqual(['3']);
    expect(filterByTab(list, NOTIFICATION_FILTER_TAB.all)).toHaveLength(3);
  });
});

describe('groupByDay', () => {
  it('splits into today, yesterday and older', () => {
    const today = stored({ id: 't', receivedAt: NOW });
    const yesterday = stored({
      id: 'y',
      receivedAt: NOW - 24 * 60 * 60 * 1000,
    });
    const older = stored({ id: 'o', receivedAt: NOW - 3 * 24 * 60 * 60 * 1000 });
    expect(daySectionFor(today.receivedAt, NOW)).toBe(NOTIFICATION_DAY_SECTION.today);
    expect(daySectionFor(yesterday.receivedAt, NOW)).toBe(NOTIFICATION_DAY_SECTION.yesterday);
    expect(daySectionFor(older.receivedAt, NOW)).toBe(NOTIFICATION_DAY_SECTION.older);
    expect(groupByDay([older, today, yesterday], NOW).map((group) => group.key)).toEqual([
      'today',
      'yesterday',
      'older',
    ]);
  });
});

describe('isIncidentNotificationType', () => {
  it('matches the old incident tab set', () => {
    expect(isIncidentNotificationType('NewIncident')).toBe(true);
    expect(isIncidentNotificationType('NewTms')).toBe(false);
    expect(isIncidentNotificationType(null)).toBe(false);
  });
});
