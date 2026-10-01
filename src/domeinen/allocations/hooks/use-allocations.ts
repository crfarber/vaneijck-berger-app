import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { allocationKeys, vehicleReleaseKeys } from '../domain/query-keys';
import { createAllocationSections } from '../domain/sections';
import { useAllocationsApi } from './allocations-context';

export { allocationKeys, vehicleReleaseKeys };

/**
 * The overview of the berger: active, pending and vehicle release blocks. Vehicle releases are
 * their own query — a location whose fetch fails should not blank the allocations the berger
 * actually has to act on (the API already drops just that one location, see `listVehicleReleases`).
 */
export function useAllocations() {
  const api = useAllocationsApi();
  const allocations = useQuery({
    queryKey: allocationKeys.list(),
    queryFn: ({ signal }) => api.list({ signal }),
  });
  const vehicleReleases = useQuery({
    queryKey: vehicleReleaseKeys.list(),
    queryFn: ({ signal }) => api.listVehicleReleases({ signal }),
  });

  const sections = useMemo(
    () => createAllocationSections(allocations.data ?? [], vehicleReleases.data ?? []),
    [allocations.data, vehicleReleases.data],
  );

  return {
    ...allocations,
    isRefetching: allocations.isRefetching || vehicleReleases.isRefetching,
    sections,
    refetch: () => Promise.all([allocations.refetch(), vehicleReleases.refetch()]),
  };
}
