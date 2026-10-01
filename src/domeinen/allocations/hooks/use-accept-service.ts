import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConfirmReason } from '@/domeinen/location';
import type { TargetSource } from '@/domeinen/services';
import type { StatusOutcome } from '@/shared/feedback/status-overlay';
import { confirm } from '@/shared/ui/confirm';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { feedbackForAcceptService } from '../domain/action-feedback';
import { useServiceActionsService } from './allocations-context';
import { serviceKeys } from './use-services';

type ConfirmTranslate = {
  (key: 'services.confirmLocation.noCurrentLocation.title'): string;
  (key: 'services.confirmLocation.noCurrentLocation.message'): string;
  (key: 'services.confirmLocation.noTargetLocation.title'): string;
  (key: 'services.confirmLocation.noTargetLocation.message'): string;
  (key: 'services.confirmLocation.tooFar.title'): string;
  (key: 'services.confirmLocation.tooFar.message'): string;
  (key: 'common.cancel'): string;
  (key: 'feedback.proceedAnyway'): string;
};

function textsFor(t: ConfirmTranslate, reason: ConfirmReason): { title: string; message: string } {
  switch (reason) {
    case 'no-current-location':
      return {
        title: t('services.confirmLocation.noCurrentLocation.title'),
        message: t('services.confirmLocation.noCurrentLocation.message'),
      };
    case 'no-target-location':
      return {
        title: t('services.confirmLocation.noTargetLocation.title'),
        message: t('services.confirmLocation.noTargetLocation.message'),
      };
    case 'too-far':
      return {
        title: t('services.confirmLocation.tooFar.title'),
        message: t('services.confirmLocation.tooFar.message'),
      };
  }
}

/** Resolves once the berger picks accept-anyway or cancel. Ported from `useLocationCheck`'s
 * own promise-wrapped `Alert.alert`. */
function askToProceedAnyway(t: ConfirmTranslate, reason: ConfirmReason): Promise<boolean> {
  const texts = textsFor(t, reason);
  return confirm({
    title: texts.title,
    message: texts.message,
    cancelLabel: t('common.cancel'),
    confirmLabel: t('feedback.proceedAnyway'),
  });
}

/**
 * Accepting a service: confirm proximity first (three reasons a confirmation is needed — no
 * current position, no target position, or 500 m or more away), then accept. Ported from
 * `useAcceptService`/`useLocationCheck`.
 */
export function useAcceptService(incidentId: string) {
  const { t } = useTranslation();
  const service = useServiceActionsService();
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);

  const accept = async (serviceId: string, source: TargetSource): Promise<void> => {
    const decision = await service.checkAcceptProximity(source);
    if (decision.action === 'confirm') {
      const proceed = await askToProceedAnyway(t, decision.reason);
      if (!proceed) {
        return;
      }
    }

    setBusyServiceId(serviceId);
    try {
      await statusOverlay.run(t('feedback.processing.acceptService'), async () => {
        const result = await service.acceptService(serviceId);
        if (result.ok) {
          await queryClient.invalidateQueries({ queryKey: serviceKeys.byIncident(incidentId) });
        }
        const mapped = feedbackForAcceptService(result);
        if (mapped.kind === 'none') {
          return { tone: 'none' } satisfies StatusOutcome;
        }
        return { tone: mapped.tone, message: t(mapped.messageKey) };
      });
    } finally {
      setBusyServiceId(null);
    }
  };

  return { accept, busyServiceId };
}
