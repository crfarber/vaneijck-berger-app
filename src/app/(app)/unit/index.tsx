import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  allocationUnitKeys,
  CurrentUnitOverviewScreen,
  ExtendShiftScreen,
  useUnitRegistrationFlow,
} from '@/domeinen/allocation-unit/ui';
import { allocationKeys } from '@/domeinen/allocations';
import { useCompleteAllocationAccept } from '@/domeinen/allocations/ui';
import { useSession } from '@/domeinen/auth/ui';
import { onboardingGateKey } from '@/domeinen/onboarding/ui';

export default function UnitIndexRoute() {
  const userType = useSession((state) => state.userType);
  const queryClient = useQueryClient();
  const { mode, returnTo } = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const { start } = useUnitRegistrationFlow();
  const completeAccept = useCompleteAllocationAccept();
  const isOnboarding = mode === 'onboarding';
  const isAccepting = mode === 'accept';
  const extendOnly = mode === 'extend';

  const onSaved = useCallback(() => {
    void completeAccept(() => {
      void queryClient.invalidateQueries({ queryKey: onboardingGateKey });
      void queryClient.invalidateQueries({ queryKey: allocationUnitKeys.current() });
      router.replace(
        returnTo === 'allocation-unit-management' ? '/allocation-unit-management' : '/',
      );
    });
  }, [completeAccept, queryClient, returnTo]);

  const openRegistration = useCallback(
    (replace: boolean) => {
      if (userType === null) {
        return;
      }

      start({
        isOnboarding,
        onRegistered: onSaved,
        onOpenWork: isOnboarding
          ? () => {
              void queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
              router.replace('/?openWork=1');
            }
          : undefined,
      });

      const route = userType === 'internal' ? '/unit/internal/vehicle' : '/unit/external/vehicle';
      if (replace) {
        router.replace(route);
      } else {
        router.push(route);
      }
    },
    [isOnboarding, onSaved, queryClient, start, userType],
  );

  useEffect(() => {
    if ((!isOnboarding && !isAccepting) || extendOnly || userType === null) {
      return;
    }
    openRegistration(true);
  }, [extendOnly, isAccepting, isOnboarding, openRegistration, userType]);

  const changeUnit = useCallback(() => openRegistration(false), [openRegistration]);
  const registerMissingUnit = useCallback(() => openRegistration(true), [openRegistration]);
  const changeEndDate = useCallback(() => router.push('/unit?mode=extend'), []);

  if (extendOnly) {
    return <ExtendShiftScreen onExtended={onSaved} isOnboarding={false} />;
  }

  if (isOnboarding || isAccepting || userType === null) {
    return null;
  }

  return (
    <CurrentUnitOverviewScreen
      onChangeUnit={changeUnit}
      onChangeEndDate={changeEndDate}
      onMissingUnit={registerMissingUnit}
    />
  );
}
