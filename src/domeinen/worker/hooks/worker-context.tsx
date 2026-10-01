import { createContext, useContext, type ReactNode } from 'react';
import type { WorkerApi } from '../api/worker-api';
import type { WorkerAvailabilityService } from '../service/worker-availability-service';

export type WorkerContextValue = {
  api: WorkerApi;
  availabilityService: WorkerAvailabilityService;
};

const WorkerContext = createContext<WorkerContextValue | null>(null);

/** Supplied by `bootstrap/providers.tsx`. */
export function WorkerApiProvider({
  value,
  children,
}: {
  value: WorkerContextValue;
  children: ReactNode;
}) {
  return <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>;
}

function useWorkerContext(): WorkerContextValue {
  const value = useContext(WorkerContext);
  if (value === null) {
    throw new Error('useWorkerApi must be used inside <WorkerApiProvider>');
  }
  return value;
}

export const useWorkerApi = (): WorkerApi => useWorkerContext().api;

export const useWorkerAvailabilityService = (): WorkerAvailabilityService =>
  useWorkerContext().availabilityService;
