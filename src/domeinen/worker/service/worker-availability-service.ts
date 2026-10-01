import type { ReferenceDataService } from '@/domeinen/reference-data';
import type { Logger } from '@/shared/logging/logger';
import { err, ok, type Result } from '@/shared/result';
import type { WorkerApi } from '../api/worker-api';
import { parseAvailabilityOptionRows } from '../api/schemas';
import type { AvailabilityOption } from '../domain/availability';

/** The `dn_availabilitystatuscode` reference-data entity: every availability the CRM knows. */
const AVAILABILITY_ENTITY_NAME = 'dn_availabilitystatuscode';

export type WorkerAvailabilityService = {
  /** Every availability row from sync (including busy). Filtering for the picker is domain logic. */
  listOptions(): Promise<AvailabilityOption[]>;
  /** Writes the new status and leaves cache invalidation to the hook. */
  setAvailability(statuscode: number): Promise<Result<void, 'request-failed'>>;
};

export type WorkerAvailabilityServiceDeps = {
  api: WorkerApi;
  referenceDataService: ReferenceDataService;
  logger?: Logger;
};

export function createWorkerAvailabilityService(
  deps: WorkerAvailabilityServiceDeps,
): WorkerAvailabilityService {
  const { api, referenceDataService, logger } = deps;

  return {
    async listOptions() {
      const raw = await referenceDataService.getEntity(AVAILABILITY_ENTITY_NAME);
      if (raw === null) {
        return [];
      }
      const { options, rejected } = parseAvailabilityOptionRows(raw);
      if (rejected.length > 0) {
        logger?.warn('app', 'Some availability-status rows failed to parse', {
          count: rejected.length,
        });
      }
      return options;
    },

    async setAvailability(statuscode) {
      try {
        await api.setAvailability(statuscode);
        return ok(undefined);
      } catch (error) {
        logger?.warn('app', 'Worker availability update failed', { error });
        return err('request-failed');
      }
    },
  };
}
