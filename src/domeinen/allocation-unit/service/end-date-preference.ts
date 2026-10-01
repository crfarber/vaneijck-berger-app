import type { KeyValueStore } from '@/shared/platform/ports';
import { getDefaultEndDate, isBeyond24Hours, isInPast } from '../domain/working-hours';

export const REMEMBERED_END_DATE_KEY = 'allocationUnit.rememberedEndDate';

export type EndDatePreference = {
  /**
   * The end date to propose. The remembered one is used when it is still valid; during
   * onboarding, or when it is missing, malformed, past or too far away, it is now plus 8 hours.
   */
  getProposedEndDate(options: { isOnboarding: boolean; now: Date }): Promise<Date>;
  remember(endDate: Date): Promise<void>;
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

    async remember(endDate) {
      await store.setItem(REMEMBERED_END_DATE_KEY, endDate.toISOString());
    },
  };
}
