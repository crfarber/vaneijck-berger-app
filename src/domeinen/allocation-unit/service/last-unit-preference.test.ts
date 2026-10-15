import { describe, expect, it } from 'vitest';
import { createInMemoryStore } from '@/test/fakes';
import type { LastUnitSnapshot } from '../domain/last-unit-snapshot';
import { createLastUnitPreference, LAST_UNIT_SNAPSHOT_KEY } from './last-unit-preference';

const snapshot: LastUnitSnapshot = {
  kind: 'external',
  workerId: 'w1',
  userType: 'external',
  plate: 'AB12CD',
};

describe('createLastUnitPreference', () => {
  it('has nothing remembered on a fresh device', async () => {
    expect(await createLastUnitPreference(createInMemoryStore()).load()).toBeNull();
  });

  it('remembers and loads the last unit snapshot', async () => {
    const store = createInMemoryStore();
    const preference = createLastUnitPreference(store);

    await preference.remember(snapshot);

    expect(await preference.load()).toEqual(snapshot);
    expect(JSON.parse(store.dump()[LAST_UNIT_SNAPSHOT_KEY] ?? 'null')).toEqual(snapshot);
  });

  it('ignores corrupt stored JSON', async () => {
    const preference = createLastUnitPreference(
      createInMemoryStore({ [LAST_UNIT_SNAPSHOT_KEY]: '{' }),
    );

    expect(await preference.load()).toBeNull();
  });

  it('clears the snapshot when asked', async () => {
    const store = createInMemoryStore();
    const preference = createLastUnitPreference(store);
    await preference.remember(snapshot);

    await preference.clear();

    expect(await preference.load()).toBeNull();
    expect(store.dump()[LAST_UNIT_SNAPSHOT_KEY]).toBeUndefined();
  });
});
