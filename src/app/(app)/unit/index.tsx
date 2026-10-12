import { useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import {
  allocationUnitKeys,
  CurrentUnitOverviewScreen,
  ExtendShiftScreen,
  useUnitRegistrationFlow,
} from '@/domeinen/allocation-unit/ui';
import { allocationKeys } from '@/domeinen/allocations';
import {
  hasActiveAllocations,
  useAllocations,
  useCompleteAllocationAccept,
} from '@/domeinen/allocations/ui';
import { useSession } from '@/domeinen/auth/ui';
import { onboardingGateKey } from '@/domeinen/onboarding/ui';
import { ChevronLeftSVG } from '@/shared/ui/icons/chevron-left';
import { goBackOrReplace } from '@/shared/ui/navigation';
import { colors } from '@/shared/ui/theme';

export default function UnitIndexRoute() {
  const { t } = useTranslation();
  const userType = useSession((state) => state.userType);
  const queryClient = useQueryClient();
  const { mode, returnTo } = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const { start } = useUnitRegistrationFlow();
  const completeAccept = useCompleteAllocationAccept();
  const { sections } = useAllocations();
  const hasActiveWork = hasActiveAllocations(sections);
  const isOnboarding = mode === 'onboarding';
  const isAccepting = mode === 'accept';
  const extendOnly = mode === 'extend';
  const fromSettings = returnTo === 'allocation-unit-management';

  const goBack = useCallback(() => {
    goBackOrReplace(router, fromSettings ? '/settings' : '/');
  }, [fromSettings]);

  const onSaved = useCallback(() => {
    void completeAccept(() => {
      void queryClient.invalidateQueries({ queryKey: onboardingGateKey });
      void queryClient.invalidateQueries({ queryKey: allocationUnitKeys.current() });
      router.replace(fromSettings ? '/allocation-unit-management' : '/');
    });
  }, [completeAccept, fromSettings, queryClient]);

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
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={8}
              onPress={goBack}
              style={{ paddingHorizontal: 4 }}
            >
              <ChevronLeftSVG color={colors.brandText} />
            </Pressable>
          ),
        }}
      />
      <CurrentUnitOverviewScreen
        hasActiveWork={hasActiveWork}
        onChangeUnit={changeUnit}
        onChangeEndDate={changeEndDate}
        onMissingUnit={registerMissingUnit}
      />
    </>
  );
}
