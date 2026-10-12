import { describe, expect, it } from 'vitest';
import { createInMemoryStore } from '@/test/fakes';
import { createRecentTruckPreference, RECENT_TRUCK_IDS_KEY } from './recent-truck-preference';

describe('createRecentTruckPreference', () => {
  it('keeps the five newest unique truck ids first', async () => {
    const store = createInMemoryStore();
    const preference = createRecentTruckPreference(store);

    for (const id of ['truck-1', 'truck-2', 'truck-3', 'truck-4', 'truck-5', 'truck-6']) {
      await preference.remember(id);
    }
    await preference.remember('truck-3');

    expect(await preference.load()).toEqual([
      'truck-3',
      'truck-6',
      'truck-5',
      'truck-4',
      'truck-2',
    ]);
    expect(store.dump()[RECENT_TRUCK_IDS_KEY]).toBe(
      JSON.stringify(['truck-3', 'truck-6', 'truck-5', 'truck-4', 'truck-2']),
    );
  });

  it('ignores malformed stored data', async () => {
    const preference = createRecentTruckPreference(
      createInMemoryStore({ [RECENT_TRUCK_IDS_KEY]: '{not-json' }),
    );

    expect(await preference.load()).toEqual([]);
  });

  it('clears recent trucks on sign-out', async () => {
    const store = createInMemoryStore();
    const preference = createRecentTruckPreference(store);
    await preference.remember('truck-1');

    await preference.clear();

    expect(await preference.load()).toEqual([]);
    expect(store.dump()[RECENT_TRUCK_IDS_KEY]).toBeUndefined();
  });
});
