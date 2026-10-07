import { createStore, type StoreApi } from 'zustand/vanilla';
import { createAllocationSections, hasActiveAllocations } from '../domain/sections';
import { classifyAllocation } from '../domain/status';
import type { Allocation } from '../domain/types';
import type { AcceptResult, AllocationActionsService } from '../service/allocation-actions-service';

export type AcceptFlowAllocation = Pick<Allocation, 'dn_allocationid' | 'statuscode' | 'statecode'>;

type AcceptIntent = { allocationId: string; token: number };

type AllocationAcceptFlowState = {
  pending: AcceptIntent | null;
  completing: boolean;
  start(allocationId: string): number | null;
  cancel(token?: number | null): void;
  isCurrent(token: number): boolean;
  complete(token: number | null): Promise<AcceptResult | null>;
};

export type AllocationAcceptFlow = StoreApi<AllocationAcceptFlowState>;

export function createAllocationAcceptFlow(deps: {
  loadAllocations(): Promise<readonly AcceptFlowAllocation[]>;
  actionsService: Pick<AllocationActionsService, 'accept'>;
  canStart?: () => boolean;
}): AllocationAcceptFlow {
  let generation = 0;
  return createStore<AllocationAcceptFlowState>()((set, get) => ({
    pending: null,
    completing: false,
    isCurrent: (token) => generation === token,
    start(allocationId) {
      if (get().pending !== null || deps.canStart?.() === false) {
        return null;
      }
      const token = ++generation;
      set({ pending: { allocationId, token }, completing: false });
      return token;
    },
    cancel(token) {
      if (token !== undefined && get().pending?.token !== token) {
        return;
      }
      generation++;
      set({ pending: null, completing: false });
    },
    async complete(token) {
      const intent = get().pending;
      if (intent === null || intent.token !== token || get().completing) {
        return null;
      }
      set({ completing: true });
      try {
        const allocations = await deps.loadAllocations();
        if (generation !== token) {
          return null;
        }
        const allocation = allocations.find(
          (entry) => entry.dn_allocationid === intent.allocationId,
        );
        if (allocation === undefined || classifyAllocation(allocation) !== 'pending') {
          return null;
        }
        const activeWork = hasActiveAllocations(createAllocationSections(allocations, []));
        const result = await deps.actionsService.accept(
          intent.allocationId,
          activeWork,
          () => generation === token,
        );
        return generation === token ? result : null;
      } catch {
        if (generation !== token) {
          return null;
        }
        return { kind: 'failed' };
      } finally {
        if (generation === token) {
          set({ pending: null, completing: false });
        }
      }
    },
  }));
}
