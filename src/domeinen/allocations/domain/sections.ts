import { classifyAllocation } from './status';
import type { Allocation } from './types';

export type AllocationSection<Item> = {
  readonly type: 'active' | 'pending' | 'vehicle_releases';
  readonly data: readonly Item[];
  readonly count: number;
};

export type ListedAllocation = Pick<Allocation, 'statuscode' | 'statecode'> & {
  readonly incident?: { readonly dn_name?: string } | null;
};

/**
 * The three blocks of the overview: active allocations (most recent first), pending allocations
 * (by incident name) and vehicle releases. Does not change its input.
 */
export function createAllocationSections<A extends ListedAllocation, R>(
  allocations: readonly A[],
  vehicleReleases: readonly R[],
): [AllocationSection<A>, AllocationSection<A>, AllocationSection<R>] {
  const active: A[] = [];
  const pending: A[] = [];

  for (const allocation of allocations) {
    const bucket = classifyAllocation(allocation);
    if (bucket === 'active') {
      active.push(allocation);
    } else if (bucket === 'pending') {
      pending.push(allocation);
    }
  }

  const byName = (a: A, b: A) =>
    (a.incident?.dn_name ?? '').localeCompare(b.incident?.dn_name ?? '', 'nl');

  // Copy before reversing/sorting: `reverse` and `sort` change the array in place.
  const newestFirst = [...active].reverse();
  const byIncidentName = [...pending].sort(byName);

  return [
    { type: 'active', data: newestFirst, count: newestFirst.length },
    { type: 'pending', data: byIncidentName, count: byIncidentName.length },
    { type: 'vehicle_releases', data: vehicleReleases, count: vehicleReleases.length },
  ];
}

/**
 * Work in progress: what blocks changing the unit and drives `decideReregister`. Pending
 * allocations do not count, as in the old app's `useForceUserReregister` (open question 32).
 */
export function hasActiveAllocations(sections: readonly AllocationSection<unknown>[]): boolean {
  return sections.some((section) => section.type === 'active' && section.count > 0);
}
