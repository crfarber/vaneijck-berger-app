import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { resolveOpenServiceRoute } from '@/domeinen/services';
import type { StatusOutcome } from '@/shared/feedback/status-overlay';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { resolvePreviewService } from '../domain/preview-service';
import type { Service } from '../domain/types';
import { useAllocationsApi, useRdwApi } from './allocations-context';
import { useProcessingExit } from './use-processing-exit';
import { createServicesQueryOptions, serviceKeys } from './use-services';

/**
 * Open one service via the shared services query (15 min staleTime). Only hydrates from the
 * network when that cache is stale or empty — then behind the same processing overlay as other
 * mutations; otherwise reuses what the list or an earlier open already loaded. Leave immediately
 * when it may no longer be submitted, and open the closing screen when it is already at
 * HULPVERLENING_AFGEROND. Anything in between opens the processing form (`service-form`).
 * Preview skips the submit-allowed gate; when the list row still lacks `dn_serviceid`, preview
 * hydrates first (same overlay) and then opens read-only.
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
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const api = useAllocationsApi();
  const rdwApi = useRdwApi();
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

  const routeAfterStatus = (fresh: Service, serviceId: string): void => {
    const route = resolveOpenServiceRoute(fresh.statuscode);
    if (route === 'blocked') {
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

    if (route === 'finish') {
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]',
        params: { id: allocationId, serviceId },
      });
      return;
    }

    openForm(serviceId, false);
  };

  const resolveService = async (service: Service, serviceId: string): Promise<Service> => {
    const cached = await queryClient
      .fetchQuery(createServicesQueryOptions(api, rdwApi, incidentId, services))
      .catch(() => null);
    return cached?.find((item) => item.dn_serviceid === serviceId) ?? service;
  };

  const open = async (service: Service): Promise<void> => {
    const serviceId = service.dn_serviceid;
    if (!serviceId) {
      return;
    }

    const query = queryClient
      .getQueryCache()
      .find({ queryKey: serviceKeys.byIncident(incidentId) });
    const needsRefresh = query === undefined || query.isStale();

    if (!needsRefresh) {
      const fresh =
        queryClient
          .getQueryData<Service[]>(serviceKeys.byIncident(incidentId))
          ?.find((item) => item.dn_serviceid === serviceId) ?? service;
      routeAfterStatus(fresh, serviceId);
      return;
    }

    await statusOverlay.run(t('feedback.processing.openService'), async () => {
      const fresh = await resolveService(service, serviceId);
      routeAfterStatus(fresh, serviceId);
      return { tone: 'none' } satisfies StatusOutcome;
    });
  };

  const openPreview = async (service: Service): Promise<void> => {
    const serviceId = service.dn_serviceid;
    if (serviceId) {
      openForm(serviceId, true);
      return;
    }

    await statusOverlay.run(t('feedback.processing.openService'), async () => {
      const cached = await queryClient
        .fetchQuery(createServicesQueryOptions(api, rdwApi, incidentId, services))
        .catch(() => null);
      const resolved = resolvePreviewService(service, cached ?? [], services);
      if (resolved?.dn_serviceid) {
        openForm(resolved.dn_serviceid, true);
      }
      return { tone: 'none' } satisfies StatusOutcome;
    });
  };

  return { open, openPreview };
}
