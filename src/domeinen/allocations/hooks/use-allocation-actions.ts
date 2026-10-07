import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import type { ReregisterReason } from '@/domeinen/allocation-unit';
import type { StatusOutcome } from '@/shared/feedback/status-overlay';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import {
  feedbackForAcceptAllocation,
  feedbackForFinishAllocation,
} from '../domain/action-feedback';
import { isAllocationFinished } from '../domain/finished';
import type { Allocation } from '../domain/types';
import {
  useAllocationAcceptFlow,
  useAllocationActionsService,
  useAllocationsApi,
} from './allocations-context';
import {
  createAllocationSections,
  hasActiveAllocations as hasActiveWork,
} from '../domain/sections';
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
  const api = useAllocationsApi();
  const acceptFlow = useAllocationAcceptFlow();
  const accepting = useRef(false);
  const [busy, setBusy] = useState<AllocationActionBusy>(null);
  const isFinished = isAllocationFinished(allocation);

  const toOutcome = (mapped: ReturnType<typeof feedbackForAcceptAllocation>): StatusOutcome => {
    if (mapped.kind === 'none') {
      return { tone: 'none' };
    }
    return { tone: mapped.tone, message: t(mapped.messageKey) };
  };

  const accept = async (): Promise<void> => {
    if (accepting.current || acceptFlow.getState().pending !== null) {
      return;
    }
    accepting.current = true;
    setBusy('accept');
    try {
      let dialog: ReregisterReason | 'blocked' | null = null;
      await statusOverlay.run(t('feedback.processing.acceptAllocation'), async () => {
        const allocations = await queryClient.fetchQuery({
          queryKey: allocationKeys.list(),
          queryFn: ({ signal }) => api.list({ signal }),
          staleTime: 0,
        });
        const activeWork =
          hasActiveAllocations || hasActiveWork(createAllocationSections(allocations, []));
        const result = await service.accept(allocation.dn_allocationid, activeWork);
        switch (result.kind) {
          case 'accepted':
            await queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
            return toOutcome(feedbackForAcceptAllocation(result));
          case 'reregister-required':
            dialog = result.reason;
            return { tone: 'none' };
          case 'blocked':
            dialog = 'blocked';
            return { tone: 'none' };
          case 'failed':
          case 'queued':
            return toOutcome(feedbackForAcceptAllocation(result));
        }
      });
      const startRecovery = (mode: 'accept' | 'extend'): void => {
        if (acceptFlow.getState().start(allocation.dn_allocationid) !== null) {
          router.push({ pathname: '/unit', params: { mode } });
        }
      };
      if (dialog === 'no-unit' || dialog === 'no-vehicle') {
        Alert.alert(
          t('allocations.actions.registerToAcceptTitle'),
          t('allocations.actions.registerToAcceptMessage'),
          [
            { text: t('common.no'), style: 'cancel' },
            { text: t('common.yes'), onPress: () => startRecovery('accept') },
          ],
        );
      } else if (dialog === 'expired') {
        startRecovery('extend');
      } else if (dialog === 'blocked') {
        Alert.alert(
          t('allocations.actions.acceptBlockedTitle'),
          t('allocations.actions.acceptBlockedMessage'),
        );
      }
    } finally {
      accepting.current = false;
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
