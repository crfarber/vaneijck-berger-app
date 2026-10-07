import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { feedbackForAcceptAllocation } from '../domain/action-feedback';
import { allocationKeys } from '../domain/query-keys';
import { useAllocationAcceptFlow } from './allocations-context';

export function useCompleteAllocationAccept(): (onFinished: () => void) => Promise<void> {
  const flow = useAllocationAcceptFlow();
  const [token] = useState(() => flow.getState().pending?.token ?? null);
  const completing = useRef(false);
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const { t } = useTranslation();

  return useCallback(
    async (onFinished: () => void): Promise<void> => {
      if (completing.current) {
        return;
      }
      completing.current = true;
      if (token !== null) {
        if (!flow.getState().isCurrent(token)) {
          return;
        }
        await statusOverlay.run(t('feedback.processing.acceptAllocation'), async () => {
          const result = await flow.getState().complete(token);
          if (result === null) {
            return { tone: 'none' };
          }
          if (result.kind === 'accepted' || result.kind === 'queued') {
            await queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
          }
          if (result.kind === 'blocked') {
            return { tone: 'error', message: t('allocations.actions.acceptBlockedMessage') };
          }
          if (result.kind === 'reregister-required') {
            return { tone: 'error', message: t('allocations.actions.unitStillInvalid') };
          }
          const feedback = feedbackForAcceptAllocation(result);
          return feedback.kind === 'none'
            ? { tone: 'none' }
            : { tone: feedback.tone, message: t(feedback.messageKey) };
        });
        if (!flow.getState().isCurrent(token)) {
          return;
        }
      }
      onFinished();
    },
    [flow, queryClient, statusOverlay, t, token],
  );
}
