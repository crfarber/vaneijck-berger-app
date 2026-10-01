import { createContext, useContext, type ReactNode } from 'react';
import type { Clock } from '@/shared/platform/ports';
import type { LocationReader } from '../service/location-reader';

export type LocationContextValue = {
  reader: LocationReader;
  clock: Clock;
};

const LocationContext = createContext<LocationContextValue | null>(null);

/** Supplied by `bootstrap/providers.tsx`. */
export function LocationProvider({
  value,
  children,
}: {
  value: LocationContextValue;
  children: ReactNode;
}) {
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

function useLocationContext(): LocationContextValue {
  const value = useContext(LocationContext);
  if (value === null) {
    throw new Error('LocationProvider is missing');
  }
  return value;
}

export function useLocationReader(): LocationReader {
  return useLocationContext().reader;
}

export function useLocationClock(): Clock {
  return useLocationContext().clock;
}
