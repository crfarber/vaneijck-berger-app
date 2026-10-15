import type { KeyValueStore } from '@/shared/platform/ports';
import { parseLastUnitSnapshot, type LastUnitSnapshot } from '../domain/last-unit-snapshot';

export const LAST_UNIT_SNAPSHOT_KEY = 'allocationUnit.lastUnitSnapshot';

/**
 * Last registered unit for quick reuse after logout (server unit is cancelled; this stays).
 * Survives sign-out on purpose — match by workerId before showing.
 */
export type LastUnitPreference = {
  load(): Promise<LastUnitSnapshot | null>;
  remember(snapshot: LastUnitSnapshot): Promise<void>;
  /** Optional cleanup when the snapshot belongs to another worker or is invalid. */
  clear(): Promise<void>;
};

export function createLastUnitPreference(store: KeyValueStore): LastUnitPreference {
  return {
    async load() {
      return parseLastUnitSnapshot(await store.getItem(LAST_UNIT_SNAPSHOT_KEY));
    },

    async remember(snapshot) {
      await store.setItem(LAST_UNIT_SNAPSHOT_KEY, JSON.stringify(snapshot));
    },

    async clear() {
      await store.removeItem(LAST_UNIT_SNAPSHOT_KEY);
    },
  };
}
