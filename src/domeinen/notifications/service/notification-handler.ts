import type { StandbyLocationAdviceFields } from '@/domeinen/standby-location';
import type { Logger } from '@/shared/logging/logger';
import { planEffects, type NotificationEffect } from '../domain/plan';
import type { ParsedNotification } from '../domain/types';

/** The app's reactions to a push message. Implemented on top of the data layer in `bootstrap`. */
export type NotificationActions = {
  /** Fetches one allocation into the cache. Resolves false when it could not be found. */
  fetchAllocation(allocationId: string): Promise<boolean>;
  refreshAllocations(): Promise<void>;
  removeAllocation(target: { allocationId?: string; incidentId?: string }): Promise<void> | void;
  reloadWorker(): Promise<void>;
  reloadVehicleReleases(): Promise<void>;
  applyStandbyAdvice(advice: StandbyLocationAdviceFields): void;
  expireStandbyAdvice(): void;
};

export type NotificationOutcome = {
  allocationId?: string;
  /**
   * True when the allocation the message is about can be shown (or when the message was not about
   * one). The navigation that follows a tap waits for this.
   */
  resolved: boolean;
};

export type NotificationHandler = {
  handle(notification: ParsedNotification): Promise<NotificationOutcome>;
};

export function createNotificationHandler(
  actions: NotificationActions,
  logger?: Logger,
): NotificationHandler {
  /** Runs one effect. Returns whether it worked. */
  async function run(effect: NotificationEffect): Promise<boolean> {
    try {
      switch (effect.type) {
        case 'fetch-allocation': {
          let found = false;
          try {
            found = await actions.fetchAllocation(effect.allocationId);
          } catch (error) {
            logger?.warn('notifications', 'Fetching the allocation failed', {
              allocationId: effect.allocationId,
              error,
            });
          }
          if (found) {
            return true;
          }
          logger?.warn('notifications', 'Allocation not found by id, refreshing everything', {
            allocationId: effect.allocationId,
          });
          await actions.refreshAllocations();
          return true;
        }
        case 'refresh-allocations':
          await actions.refreshAllocations();
          return true;
        case 'remove-allocation':
          await actions.removeAllocation({
            allocationId: effect.allocationId,
            incidentId: effect.incidentId,
          });
          return true;
        case 'reload-worker':
          await actions.reloadWorker();
          return true;
        case 'reload-vehicle-releases':
          await actions.reloadVehicleReleases();
          return true;
        case 'apply-standby-advice':
          actions.applyStandbyAdvice(effect.advice);
          return true;
        case 'expire-standby-advice':
          actions.expireStandbyAdvice();
          return true;
      }
    } catch (error) {
      logger?.error('notifications', 'Notification effect failed', { effect: effect.type, error });
      return false;
    }
  }

  return {
    async handle(notification) {
      let resolved = true;
      // Effects are independent: one failing must not stop the others.
      for (const effect of planEffects(notification)) {
        const worked = await run(effect);
        if (
          !worked &&
          effect.type !== 'reload-worker' &&
          effect.type !== 'apply-standby-advice' &&
          effect.type !== 'expire-standby-advice'
        ) {
          resolved = false;
        }
      }
      return { allocationId: notification.allocationId, resolved };
    },
  };
}
