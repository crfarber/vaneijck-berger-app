import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { ReregisterOutcome } from '@/domeinen/allocation-unit';
import { useAllocationUnitService } from '@/domeinen/allocation-unit/ui';
import { allocationKeys, hasActiveAllocations } from '@/domeinen/allocations';
import { useAllocations } from '@/domeinen/allocations/ui';
import { useSession } from '@/domeinen/auth/ui';
import { decideOnboarding, type OnboardingNotice, type OnboardingStep } from '../domain/next-step';

export const onboardingGateKey = ['onboarding', 'gate'] as const;

export type OnboardingGate =
  | { status: 'checking' }
  | {
      status: 'ready';
      step: OnboardingStep;
      notice: OnboardingNotice;
      reregister: ReregisterOutcome;
      recheck: () => void;
      /** Escape hatch after ACTIVE_INCIDENT: stay on the list instead of looping back to registration. */
      reportOpenWork: () => void;
    };

/**
 * Decides whether the signed-in user sees the assignments list or has to (re-)register their unit
 * first. Runs on every app start and sign-in, not just once — an expired unit sends the user back
 * here rather than needing a separate "force reregister" trigger elsewhere (docs/decisions/0014).
 *
 * Only active work counts; pending assignments do not block a (re-)registration (open question 32).
 * `backendReportedOpenWork` lives in React state for as long as `/` is mounted (cleared on sign-out
 * or restart) so a failed registration with ACTIVE_INCIDENT can escape to the list.
 */
export function useOnboardingGate({
  reportedOpenWork = false,
}: { reportedOpenWork?: boolean } = {}): OnboardingGate {
  const userType = useSession((state) => state.userType);
  const { sections, isPending: allocationsPending } = useAllocations();
  const service = useAllocationUnitService();
  const queryClient = useQueryClient();
  const activeWork = hasActiveAllocations(sections);
  const [backendReportedOpenWork, setBackendReportedOpenWork] = useState(false);
  const hasReportedOpenWork = backendReportedOpenWork || reportedOpenWork;

  const query = useQuery({
    queryKey: [...onboardingGateKey, activeWork, hasReportedOpenWork],
    queryFn: () => service.checkReregister(activeWork),
    enabled: !allocationsPending,
  });

  const reportOpenWork = useCallback((): void => {
    setBackendReportedOpenWork(true);
    void queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
    void queryClient.invalidateQueries({ queryKey: onboardingGateKey });
  }, [queryClient]);

  if (allocationsPending || userType === null || query.data === undefined) {
    return { status: 'checking' };
  }

  const decision = decideOnboarding({
    reregister: query.data,
    userType,
    backendReportedOpenWork: hasReportedOpenWork,
  });

  return {
    status: 'ready',
    step: decision.step,
    notice: decision.notice,
    reregister: query.data,
    recheck: () => void query.refetch(),
    reportOpenWork,
  };
}
