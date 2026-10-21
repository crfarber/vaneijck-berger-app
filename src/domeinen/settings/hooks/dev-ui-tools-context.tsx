import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DevUiToolsPreference } from '../service/dev-ui-tools-preference';

type DevUiToolsContextValue = {
  /** Metro UI helpers; always false outside `__DEV__` and until hydrated. */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const DevUiToolsContext = createContext<DevUiToolsContextValue | null>(null);

/**
 * Hydrates the Metro-only UI helpers preference (default off). Outside `__DEV__` the value stays
 * false and writes are ignored.
 */
export function DevUiToolsProvider({
  preference,
  children,
}: {
  preference: DevUiToolsPreference;
  children: ReactNode;
}) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    if (typeof __DEV__ !== 'boolean' || !__DEV__) {
      return;
    }
    let cancelled = false;
    void preference.isEnabled().then((stored) => {
      if (!cancelled) {
        setEnabledState(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [preference]);

  const setEnabled = useCallback(
    (next: boolean) => {
      if (typeof __DEV__ !== 'boolean' || !__DEV__) {
        return;
      }
      setEnabledState(next);
      void preference.setEnabled(next);
    },
    [preference],
  );

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);

  return <DevUiToolsContext.Provider value={value}>{children}</DevUiToolsContext.Provider>;
}

/** Whether Metro UI helpers (group answers, scenario export, …) are on. Off by default. */
export function useDevUiToolsEnabled(): boolean {
  const value = useContext(DevUiToolsContext);
  if (value === null) {
    return false;
  }
  if (typeof __DEV__ !== 'boolean' || !__DEV__) {
    return false;
  }
  return value.enabled;
}

/** Toggle for the debug screen; no-ops when the provider or Metro is missing. */
export function useDevUiToolsPreference(): DevUiToolsContextValue {
  const value = useContext(DevUiToolsContext);
  if (value === null) {
    return {
      enabled: false,
      setEnabled: () => undefined,
    };
  }
  return value;
}
