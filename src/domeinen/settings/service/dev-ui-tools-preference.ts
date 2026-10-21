import type { Logger } from '@/shared/logging/logger';
import type { KeyValueStore } from '@/shared/platform/ports';
import { parseDevUiToolsEnabled, serializeDevUiToolsEnabled } from '../domain/dev-ui-tools';

/** Device preference: Metro UI helpers stay off until the berger turns them on in Debug. */
export const DEV_UI_TOOLS_KEY = 'settings.devUiTools.enabled';

export type DevUiToolsPreference = {
  /** Defaults to false when unset or unreadable. */
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
};

export type DevUiToolsPreferenceDeps = {
  store: KeyValueStore;
  logger?: Logger;
};

export function createDevUiToolsPreference(deps: DevUiToolsPreferenceDeps): DevUiToolsPreference {
  const { store, logger } = deps;

  return {
    async isEnabled() {
      try {
        return parseDevUiToolsEnabled(await store.getItem(DEV_UI_TOOLS_KEY));
      } catch (error) {
        logger?.warn('app', 'Could not read the dev UI tools preference', { error });
        return false;
      }
    },

    async setEnabled(enabled) {
      try {
        await store.setItem(DEV_UI_TOOLS_KEY, serializeDevUiToolsEnabled(enabled));
      } catch (error) {
        logger?.warn('app', 'Could not save the dev UI tools preference', { error });
      }
    },
  };
}
