import { describe, expect, it } from 'vitest';
import {
  createNotificationDeduplicator,
  logicalNotificationKey,
  notificationDedupKeys,
} from './dedup';
import type { ParsedNotification } from './types';

const notification = (overrides: Partial<ParsedNotification> = {}): ParsedNotification => ({
  id: 'msg-1',
  token: 'NewIncident',
  hasExplicitType: true,
  allocationId: 'a1',
  title: 'Nieuw',
  body: 'A2',
  ...overrides,
});

describe('createNotificationDeduplicator', () => {
  it('lets a message through once', () => {
    const dedup = createNotificationDeduplicator();
    expect(dedup.shouldProcess(['m1'])).toBe(true);
    expect(dedup.shouldProcess(['m1'])).toBe(false);
    expect(dedup.shouldProcess(['m2'])).toBe(true);
  });

  it('always processes a message without keys', () => {
    const dedup = createNotificationDeduplicator();
    expect(dedup.shouldProcess([])).toBe(true);
    expect(dedup.shouldProcess([])).toBe(true);
  });

  it('treats any overlapping key as a repeat', () => {
    const dedup = createNotificationDeduplicator();
    expect(dedup.shouldProcess(['msg:1', 'logic:NewIncident:a:a1'])).toBe(true);
    expect(dedup.shouldProcess(['msg:2', 'logic:NewIncident:a:a1'])).toBe(false);
  });

  it('forgets the oldest keys beyond its capacity', () => {
    const dedup = createNotificationDeduplicator(3);
    ['a', 'b', 'c', 'd'].forEach((id) => dedup.shouldProcess([id]));

    expect(dedup.shouldProcess(['a'])).toBe(true); // forgotten, so processed again
    expect(dedup.shouldProcess(['d'])).toBe(false); // still remembered
  });

  it('keeps separate memories per instance', () => {
    const first = createNotificationDeduplicator();
    const second = createNotificationDeduplicator();
    first.shouldProcess(['m1']);
    expect(second.shouldProcess(['m1'])).toBe(true);
  });
});

describe('logicalNotificationKey / notificationDedupKeys', () => {
  it('prefers allocation over incident for the logical key', () => {
    expect(logicalNotificationKey(notification({ allocationId: 'a1', incidentId: 'i1' }))).toBe(
      'NewIncident:a:a1',
    );
    expect(
      logicalNotificationKey(notification({ allocationId: undefined, incidentId: 'i1' })),
    ).toBe('NewIncident:i:i1');
    expect(logicalNotificationKey(notification({ token: null, allocationId: 'a1' }))).toBeNull();
    expect(
      logicalNotificationKey(notification({ allocationId: undefined, incidentId: undefined })),
    ).toBeNull();
  });

  it('includes both the message id and the logical key when available', () => {
    expect(notificationDedupKeys(notification())).toEqual(['msg:msg-1', 'logic:NewIncident:a:a1']);
    expect(notificationDedupKeys(notification({ id: null }))).toEqual(['logic:NewIncident:a:a1']);
    expect(
      notificationDedupKeys(
        notification({ id: null, allocationId: undefined, incidentId: undefined }),
      ),
    ).toEqual([]);
  });
});
