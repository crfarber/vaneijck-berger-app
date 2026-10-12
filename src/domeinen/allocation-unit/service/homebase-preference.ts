import type { KeyValueStore } from '@/shared/platform/ports';

export const REMEMBERED_HOMEBASE_KEY = 'allocationUnit.rememberedHomebaseLocationId';

/** The last homebase an internal berger worked from, to prefill the next shift. */
export type HomebasePreference = {
  load(): Promise<string | null>;
  remember(locationId: string): Promise<void>;
  /** Drops the remembered homebase on sign-out. */
  clear(): Promise<void>;
};

export function createHomebasePreference(store: KeyValueStore): HomebasePreference {
  return {
    async load() {
      const value = await store.getItem(REMEMBERED_HOMEBASE_KEY);
      return value === null || value.trim() === '' ? null : value;
    },

    async remember(locationId) {
      await store.setItem(REMEMBERED_HOMEBASE_KEY, locationId);
    },

    async clear() {
      await store.removeItem(REMEMBERED_HOMEBASE_KEY);
    },
  };
}
