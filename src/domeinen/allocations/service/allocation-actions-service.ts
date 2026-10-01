import type { AllocationUnitService } from '@/domeinen/allocation-unit';
import { OUTBOX_KIND, shouldQueueMutation, type MutationOutbox } from '@/domeinen/outbox';
import type { ReferenceDataService } from '@/domeinen/reference-data';
import type { Logger } from '@/shared/logging/logger';
import { err, ok, type Result } from '@/shared/result';
import type { AllocationsApi } from '../api/allocations-api';
import { parseDeclineReasonRows } from '../api/schemas';
import { filterDeclineReasons, type DeclineReason } from '../domain/decline';
import { ALLOCATION_ACCEPT_STATUS, ALLOCATION_DONE_STATUS } from '../domain/status';

/** The `dn_allocation_statuscode` reference-data entity: every allocation status the CRM knows. */
const DECLINE_REASON_ENTITY_NAME = 'dn_allocation_statuscode';

export type AcceptResult =
  | { kind: 'accepted' }
  /** The unit needs (re-)registering first; the onboarding gate will take over once its query is
   * invalidated (see `use-allocation-actions`) — there is no separate "register from here" flow. */
  | { kind: 'reregister-required' }
  /** Active work exists without a usable unit: dispatch has to sort this out, not the berger. */
  | { kind: 'blocked' }
  | { kind: 'failed' }
  /** The call did not reach the server. It sits in the outbox and leaves when the connection is back. */
  | { kind: 'queued' };

export type AllocationActionsService = {
  /** Re-checks the unit (a defensive, point-in-time check — the onboarding gate only re-checks
   * on its own schedule) before accepting. Ported from `useAllocationActions.handleAcceptAllocation`. */
  accept(allocationId: string, hasActiveAllocations: boolean): Promise<AcceptResult>;
  decline(
    allocationId: string,
    statuscode: number,
  ): Promise<Result<void, 'request-failed' | 'queued'>>;
  /** "Finishing" an allocation is a decline with a fixed status — not a separate endpoint. */
  finish(allocationId: string): Promise<Result<void, 'request-failed' | 'queued'>>;
  /** The reasons to offer on the decline screen. `allowDone` also offers "finish" through the
   * same list, for the flows that do not have a separate finish action nearby. */
  getDeclineReasons(allowDone: boolean): Promise<DeclineReason[]>;
};

export type AllocationActionsServiceDeps = {
  api: AllocationsApi;
  allocationUnitService: AllocationUnitService;
  referenceDataService: ReferenceDataService;
  outbox: Pick<MutationOutbox, 'enqueue'>;
  onFinished?: (allocationId: string) => Promise<void>;
  logger?: Logger;
};

export function createAllocationActionsService(
  deps: AllocationActionsServiceDeps,
): AllocationActionsService {
  const { api, allocationUnitService, referenceDataService, outbox, onFinished, logger } = deps;

  async function submitDecline(
    allocationId: string,
    statuscode: number,
    command: 'finish' | 'decline',
  ): Promise<Result<void, 'request-failed' | 'queued'>> {
    try {
      await api.decline(allocationId, statuscode);
    } catch (error) {
      if (shouldQueueMutation(error)) {
        await outbox.enqueue(
          command === 'finish'
            ? { kind: OUTBOX_KIND.finishAllocation, allocationId }
            : { kind: OUTBOX_KIND.declineAllocation, allocationId, statuscode },
        );
        return err('queued');
      }
      logger?.warn('app', 'Allocation decline failed', { error });
      return err('request-failed');
    }
    if (command === 'finish') {
      try {
        await onFinished?.(allocationId);
      } catch (error) {
        logger?.warn('app', 'Finished allocation cleanup failed', { error });
      }
    }
    return ok(undefined);
  }

  return {
    async accept(allocationId, hasActiveAllocations) {
      const reregister = await allocationUnitService.checkReregister(hasActiveAllocations);
      if (reregister.kind === 'required') {
        return { kind: 'reregister-required' };
      }
      if (reregister.kind === 'blocked') {
        return { kind: 'blocked' };
      }
      try {
        await api.accept(allocationId, ALLOCATION_ACCEPT_STATUS);
        return { kind: 'accepted' };
      } catch (error) {
        if (shouldQueueMutation(error)) {
          await outbox.enqueue({ kind: OUTBOX_KIND.acceptAllocation, allocationId });
          return { kind: 'queued' };
        }
        logger?.warn('app', 'Allocation accept failed', { error });
        return { kind: 'failed' };
      }
    },

    decline: (allocationId, statuscode) => submitDecline(allocationId, statuscode, 'decline'),

    finish(allocationId) {
      return submitDecline(allocationId, ALLOCATION_DONE_STATUS, 'finish');
    },

    async getDeclineReasons(allowDone) {
      const raw = await referenceDataService.getEntity(DECLINE_REASON_ENTITY_NAME);
      if (raw === null) {
        return [];
      }
      const { reasons, rejected } = parseDeclineReasonRows(raw);
      if (rejected.length > 0) {
        logger?.warn('app', 'Some decline-reason rows failed to parse', { count: rejected.length });
      }
      return filterDeclineReasons(reasons, { allowDone });
    },
  };
}
