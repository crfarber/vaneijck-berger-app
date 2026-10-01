import type { KeyValueStore } from '@/shared/platform/ports';

export const RECENT_TRUCK_IDS_KEY = 'allocationUnit.recentTruckIds';
const MAX_RECENT_TRUCKS = 5;

export type RecentTruckPreference = {
  load(): Promise<readonly string[]>;
  remember(truckId: string): Promise<void>;
};

function parseTruckIds(value: string | null): string[] {
  if (value === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .slice(0, MAX_RECENT_TRUCKS);
  } catch {
    return [];
  }
}

export function createRecentTruckPreference(store: KeyValueStore): RecentTruckPreference {
  return {
    async load() {
      return parseTruckIds(await store.getItem(RECENT_TRUCK_IDS_KEY));
    },

    async remember(truckId) {
      const previous = await parseTruckIds(await store.getItem(RECENT_TRUCK_IDS_KEY));
      const next = [truckId, ...previous.filter((id) => id !== truckId)].slice(
        0,
        MAX_RECENT_TRUCKS,
      );
      await store.setItem(RECENT_TRUCK_IDS_KEY, JSON.stringify(next));
    },
  };
}
