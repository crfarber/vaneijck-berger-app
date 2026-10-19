import type { StandbyLocationAdviceFields } from '@/domeinen/standby-location';
import { NOTIFICATION_DISPLAY_MODE } from './types';
import type {
  NotificationDisplayMode,
  NotificationSource,
  NotificationToken,
  ParsedNotification,
} from './types';

/** What the app must do in response to a push message. Executed by the notification handler. */
export type NotificationEffect =
  /** Fetch one allocation. When that fails, fall back to refreshing all of them. */
  | { type: 'fetch-allocation'; allocationId: string }
  | { type: 'refresh-allocations' }
  | { type: 'remove-allocation'; allocationId?: string; incidentId?: string }
  | { type: 'reload-worker' }
  | { type: 'reload-vehicle-releases' }
  | { type: 'apply-standby-advice'; advice: StandbyLocationAdviceFields }
  | { type: 'expire-standby-advice' };

export function getDisplayMode(token: NotificationToken | null): NotificationDisplayMode {
  return token === null ? 'default' : NOTIFICATION_DISPLAY_MODE[token];
}

export const isDisabled = (mode: NotificationDisplayMode): boolean => mode === 'disabled';
export const shouldShowForegroundBanner = (mode: NotificationDisplayMode): boolean =>
  mode === 'default';
export const shouldNavigateOnTap = (mode: NotificationDisplayMode): boolean => mode === 'default';

/** A tap on a notification (or the one that started the app) may take the user to the allocation. */
export function isTapSource(source: NotificationSource | undefined): boolean {
  return source === 'opened' || source === 'initial' || source === 'notifee-press';
}

function withExpireStandby(effects: NotificationEffect[]): NotificationEffect[] {
  return [...effects, { type: 'expire-standby-advice' }];
}

export function planEffects(notification: ParsedNotification): NotificationEffect[] {
  const { token, allocationId, incidentId } = notification;

  if (token === null) {
    // Unknown or missing type: we cannot tell what changed, so look at everything.
    return withExpireStandby([{ type: 'refresh-allocations' }]);
  }
  if (isDisabled(getDisplayMode(token))) {
    return [];
  }

  switch (token) {
    case 'WorkerStatus':
      return [{ type: 'reload-worker' }];

    case 'DissolvedIncident':
    case 'AllocationDissolved':
      // Without any id we cannot tell which one to remove, so look at everything.
      // Dissolve does not expire standby (a finished assignment must not revive it either).
      return allocationId || incidentId
        ? [{ type: 'remove-allocation', allocationId, incidentId }]
        : [{ type: 'refresh-allocations' }];

    case 'VehicleDeliverance':
      return withExpireStandby([
        { type: 'reload-vehicle-releases' },
        ...(allocationId ? [{ type: 'fetch-allocation' as const, allocationId }] : []),
      ]);

    case 'NewIncident':
    case 'ChangedIncident':
    case 'AcceptService':
    case 'NewTms':
      // The old app did nothing at all when such a message carried no allocation id.
      return withExpireStandby(
        allocationId
          ? [{ type: 'fetch-allocation', allocationId }]
          : [{ type: 'refresh-allocations' }],
      );

    case 'StandbyLocationAdvice':
      return notification.standbyAdvice !== undefined
        ? [{ type: 'apply-standby-advice', advice: notification.standbyAdvice }]
        : [];
  }
}
