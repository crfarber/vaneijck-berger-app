import { createContext, useContext, type ReactNode } from 'react';
import type { PlacesClient } from '../api/google-places-client';

const PlacesContext = createContext<PlacesClient | null | undefined>(undefined);

/**
 * Makes the Places client available to any screen. Pass `null` when the API key is unset —
 * consumers hide search UI via `usePlacesClient()`.
 */
export function PlacesProvider({
  value,
  children,
}: {
  value: PlacesClient | null;
  children: ReactNode;
}) {
  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

/** The Places client, or `null` when not configured. Throws if the provider is missing. */
export function usePlacesClient(): PlacesClient | null {
  const value = useContext(PlacesContext);
  if (value === undefined) {
    throw new Error('PlacesProvider is missing');
  }
  return value;
}
