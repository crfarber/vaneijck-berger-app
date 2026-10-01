import { useQuery } from '@tanstack/react-query';
import { useWorkerApi } from './worker-context';

export const workerKeys = {
  all: ['worker'] as const,
  current: () => [...workerKeys.all, 'current'] as const,
};

/** The signed-in berger's own worker record — forward permission and the availability pill. */
export function useWorker() {
  const api = useWorkerApi();
  return useQuery({
    queryKey: workerKeys.current(),
    queryFn: () => api.get(),
  });
}
