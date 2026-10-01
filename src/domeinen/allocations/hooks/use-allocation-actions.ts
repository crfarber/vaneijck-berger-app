import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { noUnitDispatchAlertTexts, showNoUnitDispatchAlert } from '@/domeinen/allocation-unit/ui';
import type { StatusOutcome } from '@/shared/feedback/status-overlay';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import {
  feedbackForAcceptAllocation,
  feedbackForFinishAllocation,
} from '../domain/action-feedback';
import { isAllocationFinished } from '../domain/finished';
import type { Allocation } from '../domain/types';
import { useAllocationActionsService } from './allocations-context';
import { allocationKeys } from './use-allocations';

export type AllocationActionBusy = 'accept' | 'finish' | null;

/**
 * `onboarding`'s own gate query already re-derives `hasActiveAllocations` from this same
 * `allocations.list()` query on every render, so invalidating that list is enough for the gate to
 * notice a *count* change — no import of `onboarding` needed (avoiding a cycle: it already
 * imports from `allocations`). The one case this does not cover is the unit itself expiring while
 * the count stays the same; that self-corrects within the gate's own 30 s staleTime, or on the
 * next focus. Deliberately not solved more eagerly here — see docs/decisions/0014.
 */
export function useAllocationActions(allocation: Allocation, hasActiveAllocations: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const service = useAllocationActionsService();
  const [busy, setBusy] = useState<AllocationActionBusy>(null);
  const isFinished = isAllocationFinished(allocation);

  const toOutcome = (mapped: ReturnType<typeof feedbackForAcceptAllocation>): StatusOutcome => {
    if (mapped.kind === 'none') {
      return { tone: 'none' };
    }
    return { tone: mapped.tone, message: t(mapped.messageKey) };
  };

  const accept = async (): Promise<void> => {
    setBusy('accept');
    try {
      let dialog: 'reregister-required' | 'blocked' | null = null;
      await statusOverlay.run(t('feedback.processing.acceptAllocation'), async () => {
        const result = await service.accept(allocation.dn_allocationid, hasActiveAllocations);
        switch (result.kind) {
          case 'accepted':
            await queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
            return toOutcome(feedbackForAcceptAllocation(result));
          case 'reregister-required':
            dialog = 'reregister-required';
            return { tone: 'none' };
          case 'blocked':
            dialog = 'blocked';
            return { tone: 'none' };
          case 'failed':
          case 'queued':
            return toOutcome(feedbackForAcceptAllocation(result));
        }
      });
      if (dialog === 'reregister-required') {
        Alert.alert(t('allocations.actions.reregisterRequired'));
      } else if (dialog === 'blocked') {
        showNoUnitDispatchAlert(noUnitDispatchAlertTexts(t));
      }
    } finally {
      setBusy(null);
    }
  };

  const finish = async (): Promise<void> => {
    setBusy('finish');
    try {
      await statusOverlay.run(t('feedback.processing.finishAllocation'), async () => {
        const result = await service.finish(allocation.dn_allocationid);
        if (result.ok) {
          await queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
        }
        return toOutcome(feedbackForFinishAllocation(result));
      });
    } finally {
      setBusy(null);
    }
  };

  return { accept, finish, busy, isFinished };
}
