import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  getExitTarget,
  resolveProcessingExit,
  type ProcessingExitInput,
} from '@/domeinen/services';
import type { Service } from '../domain/types';
import { allocationKeys } from './use-allocations';
import { serviceKeys } from './use-services';

export type ExitContext = {
  allocationId: string;
  serviceId: string;
  incidentId: string;
  serviceTypeCode?: number;
  allocationTypeCode?: number;
  services: readonly Service[];
  excludeServiceId?: string;
  hadOtherOpenServicesBeforeExit?: boolean;
  isPreview?: boolean;
  fromProcessingFinish?: boolean;
};

export type ExitInput = ProcessingExitInput & ExitContext;

/**
 * Connects the pure exit rules (`resolveProcessingExit` / `getExitTarget`, `services` domain) to
 * real navigation and a cache refresh. Ported from `runProcessingExitFlow` /
 * `getExitNavigationTarget`: the old app's own "pure" target function read a Zustand store
 * directly and juggled photo cleanup and a full re-sync by hand. Here `getExitTarget` stays pure
 * (its input is passed in, never read from a store); a refresh is a plain query invalidation.
 * Photos remain available until the allocation is confirmed finished.
 *
 * Both incident variants use `/allocations/[id]`. That screen opens the PLTR layout when the
 * allocation type is planned transport (1012 or 1030) and the regular service list otherwise.
 */
export function useProcessingExit() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return {
    exit(input: ExitInput): void {
      const resolved = resolveProcessingExit(input);
      const target = getExitTarget({
        exitKind: resolved.exitKind,
        allocationId: input.allocationId,
        serviceId: input.serviceId,
        serviceTypeCode: input.serviceTypeCode,
        allocationTypeCode: input.allocationTypeCode,
        services: input.services,
        excludeServiceId: input.excludeServiceId,
        hadOtherOpenServicesBeforeExit: input.hadOtherOpenServicesBeforeExit,
        isPreview: input.isPreview,
        fromProcessingFinish: input.fromProcessingFinish,
      });

      if (target.kind === 'allocation') {
        router.replace('/');
      } else if (target.kind === 'incident') {
        router.replace({ pathname: '/allocations/[id]', params: { id: target.allocationId } });
      } else {
        router.replace({
          pathname: '/allocations/[id]/services/[serviceId]',
          params: { id: target.allocationId, serviceId: target.serviceId },
        });
      }

      void queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.byIncident(input.incidentId) });
    },
  };
}
