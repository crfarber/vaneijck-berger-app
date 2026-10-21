import { describe, expect, it } from 'vitest';
import { createLogger } from '@/shared/logging/logger';
import type { KeyValueStore } from '@/shared/platform/ports';
import { createFakeClock, createInMemoryStore } from '@/test/fakes';
import { createDevUiToolsPreference, DEV_UI_TOOLS_KEY } from './dev-ui-tools-preference';

function setup(store: KeyValueStore = createInMemoryStore()) {
  const logger = createLogger({ clock: createFakeClock() });
  return { preference: createDevUiToolsPreference({ store, logger }), store };
}

const brokenStore: KeyValueStore = {
  getItem: () => Promise.reject(new Error('disk')),
  setItem: () => Promise.reject(new Error('disk')),
  removeItem: () => Promise.reject(new Error('disk')),
};

describe('createDevUiToolsPreference', () => {
  it('defaults to off', async () => {
    const { preference } = setup();
    expect(await preference.isEnabled()).toBe(false);
  });

  it('remembers an explicit on choice', async () => {
    const store = createInMemoryStore();
    const { preference } = setup(store);

    await preference.setEnabled(true);

    expect(await preference.isEnabled()).toBe(true);
    expect(store.dump()[DEV_UI_TOOLS_KEY]).toBe('true');
  });

  it('can turn helpers back off', async () => {
    const { preference } = setup(createInMemoryStore({ [DEV_UI_TOOLS_KEY]: 'true' }));

    await preference.setEnabled(false);

    expect(await preference.isEnabled()).toBe(false);
  });

  it('stays off when storage fails', async () => {
    const { preference } = setup(brokenStore);
    expect(await preference.isEnabled()).toBe(false);
    await preference.setEnabled(true);
    expect(await preference.isEnabled()).toBe(false);
  });
});
