import { createContext, useContext, type ReactNode } from 'react';
import type { EndDatePreference } from '../service/end-date-preference';
import type { HomebasePreference } from '../service/homebase-preference';
import type { LastUnitPreference } from '../service/last-unit-preference';
import type { RecentTruckPreference } from '../service/recent-truck-preference';
import type { AllocationUnitService } from '../service/allocation-unit-service';
import type { Clock } from '@/shared/platform/ports';

export type AllocationUnitContextValue = {
  service: AllocationUnitService;
  clock: Clock;
  endDatePreference: EndDatePreference;
  recentTruckPreference: RecentTruckPreference;
  homebasePreference: HomebasePreference;
  lastUnitPreference: LastUnitPreference;
};

const AllocationUnitContext = createContext<AllocationUnitContextValue | null>(null);

/** Supplied by `bootstrap/providers.tsx`. The domain never creates its own dependencies. */
export function AllocationUnitProvider({
  value,
  children,
}: {
  value: AllocationUnitContextValue;
  children: ReactNode;
}) {
  return <AllocationUnitContext.Provider value={value}>{children}</AllocationUnitContext.Provider>;
}

function useAllocationUnitContext(): AllocationUnitContextValue {
  const value = useContext(AllocationUnitContext);
  if (value === null) {
    throw new Error('useAllocationUnitService must be used inside <AllocationUnitProvider>');
  }
  return value;
}

export const useAllocationUnitService = (): AllocationUnitService =>
  useAllocationUnitContext().service;

export const useAllocationUnitClock = (): Clock => useAllocationUnitContext().clock;

export const useEndDatePreference = (): EndDatePreference =>
  useAllocationUnitContext().endDatePreference;

export const useRecentTruckPreference = (): RecentTruckPreference =>
  useAllocationUnitContext().recentTruckPreference;

export const useHomebasePreference = (): HomebasePreference =>
  useAllocationUnitContext().homebasePreference;

export const useLastUnitPreference = (): LastUnitPreference =>
  useAllocationUnitContext().lastUnitPreference;
