import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { allocationQueryStaleTime } from '../domain/query-keys';
import {
  createAllocationListQueryOptions,
  createVehicleReleaseQueryOptions,
} from './use-allocations';

afterEach(() => {
  vi.useRealTimers();
});

describe('allocation query options', () => {
  it('reuses allocations when navigating back within the stale window', async () => {
    vi.useFakeTimers();
    const list = vi.fn(async () => []);
    const options = createAllocationListQueryOptions({ list });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await client.fetchQuery(options);
    vi.advanceTimersByTime(allocationQueryStaleTime - 1);
    await client.fetchQuery(options);
    expect(list).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await client.fetchQuery(options);
    expect(list).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('reuses vehicle releases when navigating back within the stale window', async () => {
    vi.useFakeTimers();
    const listVehicleReleases = vi.fn(async () => []);
    const options = createVehicleReleaseQueryOptions({ listVehicleReleases });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await client.fetchQuery(options);
    vi.advanceTimersByTime(allocationQueryStaleTime - 1);
    await client.fetchQuery(options);
    expect(listVehicleReleases).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await client.fetchQuery(options);
    expect(listVehicleReleases).toHaveBeenCalledTimes(2);
    client.clear();
  });
});
