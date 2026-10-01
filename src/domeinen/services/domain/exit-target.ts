import type { ProcessingExitKind } from './processing-exit';
import { isPltrType } from './service-types';
import { hasOpenServices, type HasStatus } from './status';

/**
 * Neutral description of where to go. Screens translate it to a route; the domain knows no router.
 * - `allocation`: the allocation overview.
 * - `incident`: the service list of the allocation, in its PLTR or its regular variant.
 * - `processing-finish`: the closing screen of a service.
 */
export type ExitTarget =
  | { kind: 'allocation' }
  | { kind: 'incident'; allocationId: string; variant: 'pltr' | 'services' }
  | { kind: 'processing-finish'; allocationId: string; serviceId: string; isPreview: boolean };

export type ExitTargetInput = {
  exitKind: ProcessingExitKind;
  allocationId: string;
  serviceId: string;
  serviceTypeCode?: number;
  /** Type code of the allocation (that of its first service). */
  allocationTypeCode?: number;
  /** Services of the allocation as they are after the refresh that follows the submit. */
  services: readonly (HasStatus & { dn_serviceid?: string })[];
  /** The service that was just handled and must not count as open work. */
  excludeServiceId?: string;
  /** Whether other services were open before this one was handled. */
  hadOtherOpenServicesBeforeExit?: boolean;
  isPreview?: boolean;
  /** The submit came from the closing screen. PLTR services then always return to the overview. */
  fromProcessingFinish?: boolean;
};

const allocationTarget: ExitTarget = { kind: 'allocation' };

function incidentTarget(allocationId: string, pltr: boolean): ExitTarget {
  return { kind: 'incident', allocationId, variant: pltr ? 'pltr' : 'services' };
}

function terminalTarget(input: ExitTargetInput): ExitTarget {
  const remaining = input.excludeServiceId
    ? input.services.filter((service) => service.dn_serviceid !== input.excludeServiceId)
    : input.services;
  const openAfterExit = hasOpenServices(remaining);

  const goToOverview = input.excludeServiceId
    ? !input.hadOtherOpenServicesBeforeExit || !openAfterExit
    : !openAfterExit;
  if (goToOverview) {
    return allocationTarget;
  }

  // When a specific service was handled, the allocation decides the variant, not that service.
  const pltr = input.excludeServiceId
    ? isPltrType(input.allocationTypeCode)
    : isPltrType(input.serviceTypeCode);
  return incidentTarget(input.allocationId, pltr);
}

export function getExitTarget(input: ExitTargetInput): ExitTarget {
  switch (input.exitKind) {
    case 'processingFinish':
      return {
        kind: 'processing-finish',
        allocationId: input.allocationId,
        serviceId: input.serviceId,
        isPreview: input.isPreview === true,
      };

    case 'continueIncident':
      return incidentTarget(input.allocationId, isPltrType(input.serviceTypeCode));

    case 'blocked':
      return allocationTarget;

    case 'terminal':
      if (input.fromProcessingFinish && isPltrType(input.serviceTypeCode)) {
        return allocationTarget;
      }
      return terminalTarget(input);
  }
}
