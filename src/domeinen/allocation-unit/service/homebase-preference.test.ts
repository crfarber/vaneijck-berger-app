import { describe, expect, it } from 'vitest';
import { createInMemoryStore } from '@/test/fakes';
import { createHomebasePreference, REMEMBERED_HOMEBASE_KEY } from './homebase-preference';

describe('createHomebasePreference', () => {
  it('has nothing remembered on a fresh device', async () => {
    expect(await createHomebasePreference(createInMemoryStore()).load()).toBeNull();
  });

  it('remembers the last chosen location', async () => {
    const store = createInMemoryStore();
    const preference = createHomebasePreference(store);

    await preference.remember('loc-1');
    await preference.remember('loc-2');

    expect(await preference.load()).toBe('loc-2');
    expect(store.dump()[REMEMBERED_HOMEBASE_KEY]).toBe('loc-2');
  });

  it('ignores a blank stored value', async () => {
    const preference = createHomebasePreference(
      createInMemoryStore({ [REMEMBERED_HOMEBASE_KEY]: '  ' }),
    );

    expect(await preference.load()).toBeNull();
  });
});
