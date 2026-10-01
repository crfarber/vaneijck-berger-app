import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createInMemoryStore } from '@/test/fakes';
import { loadQueryCache, saveQueryCache } from './query-cache-store';

describe('query cache store', () => {
  it('restores a successful list after the client is recreated', async () => {
    const store = createInMemoryStore();
    const first = new QueryClient();
    first.setQueryData(['allocations', 'list'], [{ id: 'alloc-1' }]);
    await saveQueryCache(first, store);

    const second = new QueryClient();
    await loadQueryCache(second, store);

    expect(second.getQueryData(['allocations', 'list'])).toEqual([{ id: 'alloc-1' }]);
  });

  it('ignores a cache that cannot be read', async () => {
    const store = createInMemoryStore();
    await store.setItem('query.cache', '{not json');
    const client = new QueryClient();

    await loadQueryCache(client, store);

    expect(client.getQueryData(['allocations', 'list'])).toBeUndefined();
    expect(await store.getItem('query.cache')).toBeNull();
  });
});
