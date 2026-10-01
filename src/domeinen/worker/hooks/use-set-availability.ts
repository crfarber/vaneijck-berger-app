import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { useWorkerAvailabilityService } from './worker-context';
import { workerKeys } from './use-worker';

/** Picks a new availability status and refreshes the worker query so the header pill updates. */
export function useSetAvailability() {
  const { t } = useTranslation();
  const service = useWorkerAvailabilityService();
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const [busyCode, setBusyCode] = useState<number | null>(null);

  const setAvailability = async (statuscode: number): Promise<boolean> => {
    setBusyCode(statuscode);
    let ok = false;
    try {
      await statusOverlay.run(t('feedback.processing.availability'), async () => {
        const result = await service.setAvailability(statuscode);
        if (!result.ok) {
          return { tone: 'error' as const, message: t('common.somethingWrong') };
        }
        await queryClient.invalidateQueries({ queryKey: workerKeys.current() });
        ok = true;
        return { tone: 'none' as const };
      });
      return ok;
    } finally {
      setBusyCode(null);
    }
  };

  return { setAvailability, busyCode };
}
