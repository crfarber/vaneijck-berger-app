import {
  ACCEPT_LOCATION_MAX_AGE_MS,
  ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
  type LocationReader,
  type ProximityDecision,
} from '@/domeinen/location';
import { OUTBOX_KIND, shouldQueueMutation, type MutationOutbox } from '@/domeinen/outbox';
import { checkAcceptLocation, SERVICE_STATUS, type TargetSource } from '@/domeinen/services';
import type { Logger } from '@/shared/logging/logger';
import { err, ok, type Result } from '@/shared/result';
import type { AllocationsApi } from '../api/allocations-api';

export type ServiceActionsService = {
  /** Whether accepting this service needs a confirmation first, and why (ported from
   * `useAcceptService`/`useLocationCheck`: no current position, no target position, or too far). */
  checkAcceptProximity(source: TargetSource): Promise<ProximityDecision>;
  acceptService(serviceId: string): Promise<Result<void, 'request-failed' | 'queued'>>;
  /** Declines one service (futile ride or return to dispatch). Queued on a temporary failure. */
  declineService(
    serviceId: string,
    statuscode: number,
  ): Promise<Result<void, 'request-failed' | 'queued'>>;
};

export type ServiceActionsServiceDeps = {
  api: AllocationsApi;
  locationReader: LocationReader;
  outbox: Pick<MutationOutbox, 'enqueue'>;
  logger?: Logger;
};

export function createServiceActionsService(
  deps: ServiceActionsServiceDeps,
): ServiceActionsService {
  const { api, locationReader, outbox, logger } = deps;

  return {
    async checkAcceptProximity(source) {
      const current = await locationReader.getCurrent({
        maxAgeMs: ACCEPT_LOCATION_MAX_AGE_MS,
        requiredAccuracyMeters: ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
      });
      return checkAcceptLocation(source, current);
    },

    async acceptService(serviceId) {
      try {
        // Same numeric value as accepting an allocation (875920000), but a different CRM entity's
        // option set — `SERVICE_STATUS.IN_UITVOERING`, not `ALLOCATION_ACCEPT_STATUS`.
        await api.acceptService(serviceId, SERVICE_STATUS.IN_UITVOERING);
        return ok(undefined);
      } catch (error) {
        if (shouldQueueMutation(error)) {
          await outbox.enqueue({ kind: OUTBOX_KIND.acceptService, serviceId });
          return err('queued');
        }
        logger?.warn('app', 'Service accept failed', { error });
        return err('request-failed');
      }
    },

    async declineService(serviceId, statuscode) {
      try {
        await api.declineService(serviceId, statuscode);
        return ok(undefined);
      } catch (error) {
        if (shouldQueueMutation(error)) {
          await outbox.enqueue({ kind: OUTBOX_KIND.declineService, serviceId, statuscode });
          return err('queued');
        }
        logger?.warn('app', 'Service decline failed', { error });
        return err('request-failed');
      }
    },
  };
}
