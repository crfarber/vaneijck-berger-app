import type { QueryClient } from '@tanstack/react-query';
import {
  allocationKeys,
  vehicleReleaseKeys,
  type Allocation,
  type AllocationsApi,
} from '@/domeinen/allocations';
import { workerQueryKey, type NotificationActions } from '@/domeinen/notifications';
import { HttpError } from '@/shared/api/errors';

/**
 * The cache effects of a push message. Lives here because a service may not import the query
 * library; the container is the place that knows both the cache and the allocations API.
 */
export function createQueryNotificationActions(deps: {
  queryClient: QueryClient;
  allocations: AllocationsApi;
}): NotificationActions {
  const { queryClient, allocations } = deps;

  return {
    async fetchAllocation(allocationId) {
      try {
        const allocation = await allocations.get(allocationId);
        queryClient.setQueryData<Allocation[]>(allocationKeys.list(), (current) =>
          upsertAllocation(current, allocation),
        );
        return true;
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return false;
        }
        throw error;
      }
    },

    refreshAllocations() {
      return queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
    },

    removeAllocation(target) {
      queryClient.setQueryData<Allocation[]>(allocationKeys.list(), (current) => {
        if (current === undefined) {
          return current;
        }
        return current.filter((allocation) => !matches(allocation, target));
      });
    },

    reloadWorker() {
      return queryClient.invalidateQueries({ queryKey: workerQueryKey });
    },

    reloadVehicleReleases() {
      return queryClient.invalidateQueries({ queryKey: vehicleReleaseKeys.list() });
    },
  };

  function matches(
    allocation: Allocation,
    target: { allocationId?: string; incidentId?: string },
  ): boolean {
    if (target.allocationId !== undefined && allocation.dn_allocationid === target.allocationId) {
      return true;
    }
    return (
      target.incidentId !== undefined && allocation.incident.dn_incidentid === target.incidentId
    );
  }
}

function upsertAllocation(current: Allocation[] | undefined, allocation: Allocation): Allocation[] {
  const list = current === undefined ? [] : [...current];
  const index = list.findIndex((item) => item.dn_allocationid === allocation.dn_allocationid);
  if (index === -1) {
    list.push(allocation);
    return list;
  }
  const next = [...list];
  next[index] = allocation;
  return next;
}
