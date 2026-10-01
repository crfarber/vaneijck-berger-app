import { describe, expect, it } from 'vitest';
import { createNotificationDeduplicator } from './dedup';

describe('createNotificationDeduplicator', () => {
  it('lets a message through once', () => {
    const dedup = createNotificationDeduplicator();
    expect(dedup.shouldProcess('m1')).toBe(true);
    expect(dedup.shouldProcess('m1')).toBe(false);
    expect(dedup.shouldProcess('m2')).toBe(true);
  });

  it('always processes a message without an id', () => {
    const dedup = createNotificationDeduplicator();
    expect(dedup.shouldProcess(null)).toBe(true);
    expect(dedup.shouldProcess(null)).toBe(true);
  });

  it('forgets the oldest ids beyond its capacity', () => {
    const dedup = createNotificationDeduplicator(3);
    ['a', 'b', 'c', 'd'].forEach((id) => dedup.shouldProcess(id));

    expect(dedup.shouldProcess('a')).toBe(true); // forgotten, so processed again
    expect(dedup.shouldProcess('d')).toBe(false); // still remembered
  });

  it('keeps separate memories per instance', () => {
    const first = createNotificationDeduplicator();
    const second = createNotificationDeduplicator();
    first.shouldProcess('m1');
    expect(second.shouldProcess('m1')).toBe(true);
  });
});
