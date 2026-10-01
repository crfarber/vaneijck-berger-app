import { useQuery } from '@tanstack/react-query';
import { toCurrentUnitOverview } from '../domain/current-unit-overview';
import { useAllocationUnitClock, useAllocationUnitService } from './allocation-unit-context';
import { getRemainingMinutes } from '../domain/remaining-time';

export const allocationUnitKeys = {
  all: ['allocation-unit'] as const,
  current: () => [...allocationUnitKeys.all, 'current'] as const,
};

export function useCurrentUnitOverview() {
  const service = useAllocationUnitService();
  const clock = useAllocationUnitClock();

  return useQuery({
    queryKey: allocationUnitKeys.current(),
    refetchInterval: 60_000,
    queryFn: async () => {
      const [unit, fleet] = await Promise.all([service.getCurrent(), service.getFleet()]);
      if (unit === null) {
        return null;
      }

      const overview = toCurrentUnitOverview(unit, fleet);
      if (overview.vehicleName === null) {
        return null;
      }
      return {
        ...overview,
        remainingMinutes: getRemainingMinutes(overview.validUntil, clock.now()),
      };
    },
  });
}
