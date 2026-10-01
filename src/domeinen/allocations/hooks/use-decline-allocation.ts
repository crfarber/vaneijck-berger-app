import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { feedbackForDeclineAllocation } from '../domain/action-feedback';
import { canDeclineAllocation, type DeclineReason } from '../domain/decline';
import { useAllocationActionsService } from './allocations-context';
import { allocationKeys, useAllocations } from './use-allocations';

export type DeclineAllocationOptions = {
  /** Runs once the input is valid, right before the status overlay. A sheet closes here: a View
   * cannot sit above a Modal. */
  onSubmitting?: () => void;
};

/**
 * The reason-picker of the old app's `AllocationDeclineScreen`. Blocked while a service is
 * actively being worked on (checked live against the cached allocation, not a snapshot from when
 * the berger opened the picker).
 */
export function useDeclineAllocation(
  allocationId: string,
  allowDone: boolean,
  options: DeclineAllocationOptions = {},
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const service = useAllocationActionsService();
  const { sections } = useAllocations();
  const [active, pending] = sections;

  const allocation = [...active.data, ...pending.data].find(
    (item) => item.dn_allocationid === allocationId,
  );

  const [reasons, setReasons] = useState<DeclineReason[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void service.getDeclineReasons(allowDone).then((loaded) => {
      if (!cancelled) {
        setReasons(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [service, allowDone]);

  const canDecline = canDeclineAllocation(allocation?.services);

  const submit = async (): Promise<void> => {
    if (!canDecline) {
      setMessage(t('allocations.decline.errors.activeServices'));
      return;
    }
    if (selected === null) {
      setMessage(t('allocations.decline.errors.reasonRequired'));
      return;
    }
    setBusy(true);
    setMessage(null);
    options.onSubmitting?.();
    try {
      await statusOverlay.run(t('feedback.processing.declineAllocation'), async () => {
        const result = await service.decline(allocationId, selected);
        if (!result.ok && result.error === 'request-failed') {
          return {
            tone: 'error' as const,
            message: t('common.somethingWrong'),
          };
        }
        await queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
        const mapped = feedbackForDeclineAllocation(result);
        if (mapped.kind === 'none') {
          return { tone: 'none' as const };
        }
        return { tone: mapped.tone, message: t(mapped.messageKey) };
      });
    } finally {
      setBusy(false);
    }
  };

  return { reasons, selected, setSelected, busy, message, canDecline, submit };
}
