import { createContext, useContext, type ReactNode } from 'react';
import type { RdwApi } from '@/domeinen/rdw';
import type { AllocationsApi } from '../api/allocations-api';
import type { AllocationActionsService } from '../service/allocation-actions-service';
import type { ReassignService } from '../service/reassign-service';
import type { ServiceActionsService } from '../service/service-actions-service';
import type { AllocationAcceptFlow } from '../store/allocation-accept-flow';

export type AllocationsContextValue = {
  api: AllocationsApi;
  rdwApi: RdwApi;
  actionsService: AllocationActionsService;
  acceptFlow: AllocationAcceptFlow;
  serviceActionsService: ServiceActionsService;
  reassignService: ReassignService;
};

const AllocationsContext = createContext<AllocationsContextValue | null>(null);

/** Supplied by `bootstrap/providers.tsx`. */
export function AllocationsApiProvider({
  value,
  children,
}: {
  value: AllocationsContextValue;
  children: ReactNode;
}) {
  return <AllocationsContext.Provider value={value}>{children}</AllocationsContext.Provider>;
}

function useAllocationsContext(): AllocationsContextValue {
  const value = useContext(AllocationsContext);
  if (value === null) {
    throw new Error('useAllocationsApi must be used inside <AllocationsApiProvider>');
  }
  return value;
}

export const useAllocationsApi = (): AllocationsApi => useAllocationsContext().api;
export const useRdwApi = (): RdwApi => useAllocationsContext().rdwApi;

export const useAllocationActionsService = (): AllocationActionsService =>
  useAllocationsContext().actionsService;
export const useAllocationAcceptFlow = (): AllocationAcceptFlow =>
  useAllocationsContext().acceptFlow;

export const useServiceActionsService = (): ServiceActionsService =>
  useAllocationsContext().serviceActionsService;

export const useReassignService = (): ReassignService => useAllocationsContext().reassignService;
