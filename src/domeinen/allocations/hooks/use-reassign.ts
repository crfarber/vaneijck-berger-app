import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { ACTION_FEEDBACK_MESSAGE } from '../domain/action-feedback';
import { filterColleagues } from '../domain/reassign';
import type { Colleague } from '../domain/types';
import { useReassignService } from './allocations-context';
import { allocationKeys } from './use-allocations';

export const colleagueKeys = {
  all: ['colleagues'] as const,
  list: () => [...colleagueKeys.all, 'list'] as const,
};

export type ReassignOptions = {
  /** Runs once a colleague is chosen, right before the status overlay. A sheet closes here: a
   * View cannot sit above a Modal. */
  onSubmitting?: () => void;
};

/**
 * The colleague search-and-pick the old app calls `ForwardAssignment`. Ported behaviour: tapping
 * a colleague reassigns right away — there is no separate confirmation step in the old app either.
 */
export function useReassign(incidentId: string, options: ReassignOptions = {}) {
  const { t } = useTranslation();
  const service = useReassignService();
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const colleaguesQuery = useQuery({
    queryKey: colleagueKeys.list(),
    queryFn: () => service.listColleagues(),
  });
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const colleagues: Colleague[] = filterColleagues(colleaguesQuery.data ?? [], search);

  const reassignTo = async (colleagueId: string): Promise<boolean> => {
    setBusyId(colleagueId);
    setMessage(null);
    options.onSubmitting?.();
    let ok = false;
    try {
      await statusOverlay.run(t('feedback.processing.reassign'), async () => {
        const result = await service.reassign(incidentId, colleagueId);
        if (!result.ok) {
          return { tone: 'error' as const, message: t('common.somethingWrong') };
        }
        await queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
        ok = true;
        return {
          tone: 'success' as const,
          message: t(ACTION_FEEDBACK_MESSAGE.reassigned),
        };
      });
    } finally {
      setBusyId(null);
    }
    if (!ok) {
      setMessage(t('common.somethingWrong'));
    }
    return ok;
  };

  return {
    colleagues,
    isLoading: colleaguesQuery.isLoading,
    search,
    setSearch,
    busyId,
    message,
    reassignTo,
  };
}
