import type { ReferenceDataService } from '@/domeinen/reference-data';
import type { Logger } from '@/shared/logging/logger';
import { err, ok, type Result } from '@/shared/result';
import type { AllocationsApi } from '../api/allocations-api';
import { parseColleagueRows } from '../api/schemas';
import type { Colleague } from '../domain/types';

/** The `dn_collegues` reference-data entity: every worker this berger could forward to. */
const COLLEAGUE_ENTITY_NAME = 'dn_collegues';

export type ReassignService = {
  /** Every colleague this berger can forward to. Reference data, same mechanism as `dn_fleets`
   * and `dn_allocation_statuscode` — no separate endpoint of its own. */
  listColleagues(): Promise<Colleague[]>;
  reassign(incidentId: string, colleagueId: string): Promise<Result<void, 'request-failed'>>;
};

export type ReassignServiceDeps = {
  api: AllocationsApi;
  referenceDataService: ReferenceDataService;
  logger?: Logger;
};

export function createReassignService(deps: ReassignServiceDeps): ReassignService {
  const { api, referenceDataService, logger } = deps;

  return {
    async listColleagues() {
      const raw = await referenceDataService.getEntity(COLLEAGUE_ENTITY_NAME);
      if (raw === null) {
        return [];
      }
      const { colleagues, rejected } = parseColleagueRows(raw);
      if (rejected.length > 0) {
        logger?.warn('app', 'Some colleague rows failed to parse', { count: rejected.length });
      }
      return colleagues;
    },

    async reassign(incidentId, colleagueId) {
      try {
        await api.reassign(incidentId, colleagueId);
        return ok(undefined);
      } catch (error) {
        logger?.warn('app', 'Reassigning an incident failed', { error });
        return err('request-failed');
      }
    },
  };
}
