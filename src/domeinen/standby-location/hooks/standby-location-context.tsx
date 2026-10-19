import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { StandbyLocationState } from '../domain/types';
import type { StandbyLocationService } from '../service/standby-location-service';

const StandbyLocationContext = createContext<StandbyLocationService | null>(null);

export function StandbyLocationProvider({
  value,
  children,
}: {
  value: StandbyLocationService;
  children: ReactNode;
}) {
  return (
    <StandbyLocationContext.Provider value={value}>{children}</StandbyLocationContext.Provider>
  );
}

export function useStandbyLocationApi(): StandbyLocationService {
  const value = useContext(StandbyLocationContext);
  if (value === null) {
    throw new Error('StandbyLocationProvider is missing');
  }
  return value;
}

export function useStandbyLocation<T>(selector: (state: StandbyLocationState) => T): T {
  const service = useStandbyLocationApi();
  return useSyncExternalStore(
    (onStoreChange) => service.subscribe(() => onStoreChange()),
    () => selector(service.getState()),
    () => selector(service.getState()),
  );
}
