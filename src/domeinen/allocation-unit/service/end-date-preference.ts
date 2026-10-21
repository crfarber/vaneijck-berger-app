import type { KeyValueStore } from '@/shared/platform/ports';
import { getDefaultEndDate, isBeyond24Hours, isInPast } from '../domain/working-hours';

export const REMEMBERED_END_DATE_KEY = 'allocationUnit.rememberedEndDate';

export type EndDatePreference = {
  /**
   * The end date to propose. The remembered one is used when it is still valid; during
   * onboarding, or when it is missing, malformed, past or too far away, it is now plus 9 hours.
   */
  getProposedEndDate(options: { isOnboarding: boolean; now: Date }): Promise<Date>;
  /** Raw ISO string from storage, or null when missing. Used for standby shift-end checks. */
  getRememberedEndDateIso(): Promise<string | null>;
  remember(endDate: Date): Promise<void>;
  /** Drops the remembered end date on sign-out. */
  clear(): Promise<void>;
};

export function createEndDatePreference(store: KeyValueStore): EndDatePreference {
  return {
    async getProposedEndDate({ isOnboarding, now }) {
      if (!isOnboarding) {
        const stored = await store.getItem(REMEMBERED_END_DATE_KEY);
        if (stored) {
          const remembered = new Date(stored);
          const usable =
            !Number.isNaN(remembered.getTime()) &&
            !isInPast(remembered, now) &&
            !isBeyond24Hours(remembered, now);
          if (usable) {
            return remembered;
          }
        }
      }
      return getDefaultEndDate(now);
    },

    async getRememberedEndDateIso() {
      const stored = await store.getItem(REMEMBERED_END_DATE_KEY);
      return stored !== null && stored.trim() !== '' ? stored : null;
    },

    async remember(endDate) {
      await store.setItem(REMEMBERED_END_DATE_KEY, endDate.toISOString());
    },

    async clear() {
      await store.removeItem(REMEMBERED_END_DATE_KEY);
    },
  };
}
