import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAllocationListQueryOptions,
  createVehicleReleaseQueryOptions,
} from './use-allocations';

const NAVIGATION_CACHE_TIME = 5 * 60_000;

afterEach(() => {
  vi.useRealTimers();
});

describe('allocation query options', () => {
  it('reuses allocations when navigating back within five minutes', async () => {
    vi.useFakeTimers();
    const list = vi.fn(async () => []);
    const options = createAllocationListQueryOptions({ list });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await client.fetchQuery(options);
    vi.advanceTimersByTime(NAVIGATION_CACHE_TIME - 1);
    await client.fetchQuery(options);
    expect(list).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await client.fetchQuery(options);
    expect(list).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('reuses vehicle releases when navigating back within five minutes', async () => {
    vi.useFakeTimers();
    const listVehicleReleases = vi.fn(async () => []);
    const options = createVehicleReleaseQueryOptions({ listVehicleReleases });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await client.fetchQuery(options);
    vi.advanceTimersByTime(NAVIGATION_CACHE_TIME - 1);
    await client.fetchQuery(options);
    expect(listVehicleReleases).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await client.fetchQuery(options);
    expect(listVehicleReleases).toHaveBeenCalledTimes(2);
    client.clear();
  });
});
