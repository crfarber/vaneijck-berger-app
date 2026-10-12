import { describe, expect, it } from 'vitest';
import { createLogger } from '@/shared/logging/logger';
import type { KeyValueStore } from '@/shared/platform/ports';
import { createFakeClock, createInMemoryStore } from '@/test/fakes';
import { PERMISSION_KIND } from '../domain/permission-step';
import {
  createPermissionDisclosurePreference,
  PERMISSION_DISCLOSURE_SEEN_KEY,
} from './permission-disclosure-preference';

function setup(store: KeyValueStore = createInMemoryStore()) {
  const logger = createLogger({ clock: createFakeClock() });
  const preference = createPermissionDisclosurePreference({ store, logger });
  return { preference, store, logger };
}

const brokenStore: KeyValueStore = {
  getItem: () => Promise.reject(new Error('disk')),
  setItem: () => Promise.reject(new Error('disk')),
  removeItem: () => Promise.reject(new Error('disk')),
};

describe('createPermissionDisclosurePreference', () => {
  it('starts with nothing seen', async () => {
    const { preference } = setup();
    expect((await preference.readSeen()).size).toBe(0);
  });

  it('remembers a dismissed kind across reads', async () => {
    const store = createInMemoryStore();
    const { preference } = setup(store);

    await preference.markSeen(PERMISSION_KIND.notifications);

    expect([...(await preference.readSeen())]).toEqual([PERMISSION_KIND.notifications]);
    expect(JSON.parse(store.dump()[PERMISSION_DISCLOSURE_SEEN_KEY] ?? 'null')).toEqual([
      'notifications',
    ]);
  });

  it('accumulates kinds without duplicating', async () => {
    const { preference } = setup();

    await preference.markSeen(PERMISSION_KIND.notifications);
    await preference.markSeen(PERMISSION_KIND.location);
    await preference.markSeen(PERMISSION_KIND.notifications);

    const seen = await preference.readSeen();
    expect(seen.has(PERMISSION_KIND.notifications)).toBe(true);
    expect(seen.has(PERMISSION_KIND.location)).toBe(true);
    expect(seen.size).toBe(2);
  });

  it('ignores a malformed stored value', async () => {
    const { preference } = setup(
      createInMemoryStore({ [PERMISSION_DISCLOSURE_SEEN_KEY]: '{not-json' }),
    );

    expect((await preference.readSeen()).size).toBe(0);
  });

  it('ignores unknown kind strings in storage', async () => {
    const { preference } = setup(
      createInMemoryStore({
        [PERMISSION_DISCLOSURE_SEEN_KEY]: JSON.stringify(['notifications', 'microphone']),
      }),
    );

    expect([...(await preference.readSeen())]).toEqual([PERMISSION_KIND.notifications]);
  });

  it('returns an empty set when storage cannot be read', async () => {
    const { preference, logger } = setup(brokenStore);

    expect((await preference.readSeen()).size).toBe(0);
    expect(logger.entries().some((entry) => entry.level === 'warn')).toBe(true);
  });

  it('still returns the in-memory next set when saving fails', async () => {
    const { preference, logger } = setup(brokenStore);

    const next = await preference.markSeen(PERMISSION_KIND.camera);

    expect(next.has(PERMISSION_KIND.camera)).toBe(true);
    expect(logger.entries().some((entry) => entry.level === 'warn')).toBe(true);
  });

  it('clears seen progress so the next login shows the wizard again', async () => {
    const store = createInMemoryStore();
    const { preference } = setup(store);
    await preference.markSeen(PERMISSION_KIND.notifications);

    await preference.clear();

    expect((await preference.readSeen()).size).toBe(0);
    expect(store.dump()[PERMISSION_DISCLOSURE_SEEN_KEY]).toBeUndefined();
  });

  it('logs when clearing fails and does not throw', async () => {
    const { preference, logger } = setup(brokenStore);

    await expect(preference.clear()).resolves.toBeUndefined();
    expect(logger.entries().some((entry) => entry.level === 'warn')).toBe(true);
  });
});
