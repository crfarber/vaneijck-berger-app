import { useQuery } from '@tanstack/react-query';
import type { QueryFunctionContext } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { AllocationsApi } from '../api/allocations-api';
import { allocationKeys, allocationQueryStaleTime, vehicleReleaseKeys } from '../domain/query-keys';
import { createAllocationSections } from '../domain/sections';
import { useAllocationsApi } from './allocations-context';

export { allocationKeys, vehicleReleaseKeys };

export function createAllocationListQueryOptions(api: Pick<AllocationsApi, 'list'>) {
  return {
    queryKey: allocationKeys.list(),
    queryFn: ({ signal }: QueryFunctionContext) => api.list({ signal }),
    staleTime: allocationQueryStaleTime,
  };
}

export function createVehicleReleaseQueryOptions(api: Pick<AllocationsApi, 'listVehicleReleases'>) {
  return {
    queryKey: vehicleReleaseKeys.list(),
    queryFn: ({ signal }: QueryFunctionContext) => api.listVehicleReleases({ signal }),
    staleTime: allocationQueryStaleTime,
  };
}

/**
 * The overview of the berger: active, pending and vehicle release blocks. Vehicle releases are
 * their own query — a location whose fetch fails should not blank the allocations the berger
 * actually has to act on (the API already drops just that one location, see `listVehicleReleases`).
 */
export function useAllocations(options: { refetchOnMount?: 'always' } = {}) {
  const api = useAllocationsApi();
  const allocations = useQuery({ ...createAllocationListQueryOptions(api), ...options });
  const vehicleReleases = useQuery(createVehicleReleaseQueryOptions(api));
  const refetchAllocations = allocations.refetch;
  const refetchVehicleReleases = vehicleReleases.refetch;
  const refetch = useCallback(
    () => Promise.all([refetchAllocations(), refetchVehicleReleases()]),
    [refetchAllocations, refetchVehicleReleases],
  );

  const sections = useMemo(
    () => createAllocationSections(allocations.data ?? [], vehicleReleases.data ?? []),
    [allocations.data, vehicleReleases.data],
  );

  return {
    ...allocations,
    isRefetching: allocations.isRefetching || vehicleReleases.isRefetching,
    sections,
    refetch,
  };
}
