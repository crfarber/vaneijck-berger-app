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
import { useSession } from '@/domeinen/auth/ui';
import { onboardingGateKey } from '@/domeinen/onboarding/ui';

export default function UnitIndexRoute() {
  const userType = useSession((state) => state.userType);
  const queryClient = useQueryClient();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { start } = useUnitRegistrationFlow();
  const isOnboarding = mode === 'onboarding';
  const extendOnly = mode === 'extend';

  const openRegistration = useCallback(
    (replace: boolean) => {
      if (userType === null) {
        return;
      }

      start({
        isOnboarding,
        onRegistered: () => {
          void queryClient.invalidateQueries({ queryKey: onboardingGateKey });
          void queryClient.invalidateQueries({ queryKey: allocationUnitKeys.current() });
          router.replace('/');
        },
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
    [isOnboarding, queryClient, start, userType],
  );

  useEffect(() => {
    if (!isOnboarding || extendOnly || userType === null) {
      return;
    }
    openRegistration(true);
  }, [extendOnly, isOnboarding, openRegistration, userType]);

  const changeUnit = useCallback(() => openRegistration(false), [openRegistration]);
  const registerMissingUnit = useCallback(() => openRegistration(true), [openRegistration]);
  const changeEndDate = useCallback(() => router.push('/unit?mode=extend'), []);

  if (extendOnly) {
    return (
      <ExtendShiftScreen
        onExtended={() => {
          void queryClient.invalidateQueries({ queryKey: onboardingGateKey });
          router.replace('/');
        }}
        isOnboarding={false}
      />
    );
  }

  if (isOnboarding || userType === null) {
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
