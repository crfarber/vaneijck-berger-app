import { useRouter } from 'expo-router';
import { isSubmitAllowed, SERVICE_STATUS } from '@/domeinen/services';
import type { Service } from '../domain/types';
import { useAllocationsApi } from './allocations-context';
import { useProcessingExit } from './use-processing-exit';

/**
 * Open one service the way `ProcessingServiceWrapper` did on mount: look it up fresh, leave
 * immediately when it may no longer be submitted, and open the closing screen when it is already
 * at HULPVERLENING_AFGEROND. Anything in between opens the processing form (`service-form`).
 * Preview skips the submit-allowed gate (old `CheckStatus === 1` / swipe Preview on a pending service).
 */
export function useOpenService({
  allocationId,
  incidentId,
  allocationTypeCode,
  services,
}: {
  allocationId: string;
  incidentId: string;
  allocationTypeCode?: number;
  services: readonly Service[];
}) {
  const router = useRouter();
  const api = useAllocationsApi();
  const { exit } = useProcessingExit();

  const openForm = (serviceId: string, preview: boolean): void => {
    router.push({
      pathname: '/allocations/[id]/services/[serviceId]/form',
      params: {
        id: allocationId,
        serviceId,
        ...(preview ? { mode: 'readonly' } : {}),
      },
    });
  };

  const open = async (service: Service): Promise<void> => {
    const serviceId = service.dn_serviceid;
    if (!serviceId) {
      return;
    }
    const fresh = await api.getService(serviceId).catch(() => service);

    if (!isSubmitAllowed(fresh.statuscode)) {
      exit({
        trigger: 'blocked',
        allocationId,
        serviceId,
        incidentId,
        serviceTypeCode: fresh.dn_servicetypecode ?? undefined,
        allocationTypeCode,
        services,
      });
      return;
    }

    if (fresh.statuscode === SERVICE_STATUS.HULPVERLENING_AFGEROND) {
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]',
        params: { id: allocationId, serviceId },
      });
      return;
    }

    openForm(serviceId, false);
  };

  const openPreview = (service: Service): void => {
    const serviceId = service.dn_serviceid;
    if (!serviceId) {
      return;
    }
    openForm(serviceId, true);
  };

  return { open, openPreview };
}
