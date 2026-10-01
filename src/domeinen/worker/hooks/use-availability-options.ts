import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/domeinen/auth/ui';
import { filterAvailabilityOptions, type WorkerUserKind } from '../domain/availability';
import { useWorkerAvailabilityService } from './worker-context';
import { workerKeys } from './use-worker';

export const availabilityOptionKeys = {
  all: [...workerKeys.all, 'availability-options'] as const,
};

/** All synced availability rows, plus the subset the signed-in berger may pick. */
export function useAvailabilityOptions() {
  const service = useWorkerAvailabilityService();
  const userType = useSession((state) => state.userType);
  const userKind: WorkerUserKind = userType === 'internal' ? 'internal' : 'external';

  const query = useQuery({
    queryKey: availabilityOptionKeys.all,
    queryFn: () => service.listOptions(),
  });

  const choosable = useMemo(
    () => filterAvailabilityOptions(query.data ?? [], userKind),
    [query.data, userKind],
  );

  return { ...query, choosable };
}
