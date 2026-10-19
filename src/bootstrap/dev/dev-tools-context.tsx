import { createContext, useContext, type ReactNode } from 'react';
import type { DebugSnapshot } from './collect-debug-snapshot';

export type FakeStandbyInput = {
  /** Dutch postcode; empty uses the built-in Diemen mock without lookup. */
  readonly postalCode?: string;
  /** House number; empty uses the built-in Diemen mock without lookup. */
  readonly houseNumber?: string;
};

export type FakeStandbyResult = {
  readonly status: 'active' | 'expired' | null;
  readonly hasBlockingItems: boolean;
  readonly bannerVisible: boolean;
  readonly label: string;
  readonly resolveError?:
    'invalid-input' | 'address-not-found' | 'places-unavailable' | 'no-coordinates';
};

export type DevToolsValue = {
  loadDebugSnapshot(): Promise<DebugSnapshot>;
  copyAccessToken(): Promise<boolean>;
  /**
   * Injects a StandbyLocationAdvice through the real push pipeline.
   * With postcode + house number: CRM zipcode + Places geometry; otherwise Diemen mock.
   */
  fakeStandbyLocationAdvice(input?: FakeStandbyInput): Promise<FakeStandbyResult>;
  clearStandbyLocationAdvice(): Promise<void>;
};

const DevToolsContext = createContext<DevToolsValue | null>(null);

/** Hands explicit debug actions to the React tree — never the whole container. */
export function DevToolsProvider({
  value,
  children,
}: {
  value: DevToolsValue;
  children: ReactNode;
}) {
  return <DevToolsContext.Provider value={value}>{children}</DevToolsContext.Provider>;
}

export function useDevTools(): DevToolsValue {
  const value = useContext(DevToolsContext);
  if (value === null) {
    throw new Error('useDevTools must be used inside <DevToolsProvider>');
  }
  return value;
}
