import { useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import {
  allocationUnitKeys,
  CurrentUnitOverviewScreen,
  ExtendShiftScreen,
  matchLastUnitSnapshot,
  toUnitReuseIntent,
  useAllocationUnitService,
  useLastUnitPreference,
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
import { useWorker } from '@/domeinen/worker/ui';
import { ChevronLeftSVG } from '@/shared/ui/icons/chevron-left';
import { goBackOrReplace } from '@/shared/ui/navigation';
import { colors } from '@/shared/ui/theme';

export default function UnitIndexRoute() {
  const { t } = useTranslation();
  const userType = useSession((state) => state.userType);
  const queryClient = useQueryClient();
  const { mode, returnTo, reuse } = useLocalSearchParams<{
    mode?: string;
    returnTo?: string;
    reuse?: string;
  }>();
  const { start } = useUnitRegistrationFlow();
  const lastUnitPreference = useLastUnitPreference();
  const unitService = useAllocationUnitService();
  const { data: worker } = useWorker();
  const completeAccept = useCompleteAllocationAccept();
  const {
    sections,
    isSuccess: allocationsReady,
    isFetching: allocationsFetching,
  } = useAllocations({
    refetchOnMount: 'always',
  });
  const hasActiveWork = hasActiveAllocations(sections);
  const isOnboarding = mode === 'onboarding';
  const isAccepting = mode === 'accept';
  const extendOnly = mode === 'extend';
  const reuseLast = reuse === 'last';
  const fromSettings = returnTo === 'allocation-unit-management';
  const registrationStarted = useRef(false);

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

  const registrationCallbacks = useCallback(
    () => ({
      isOnboarding,
      onRegistered: onSaved,
      onOpenWork: isOnboarding
        ? () => {
            void queryClient.invalidateQueries({ queryKey: allocationKeys.list() });
            router.replace('/?openWork=1');
          }
        : undefined,
    }),
    [isOnboarding, onSaved, queryClient],
  );

  const openRegistration = useCallback(
    (replace: boolean, reuseIntent?: ReturnType<typeof toUnitReuseIntent>) => {
      if (userType === null || hasActiveWork || !allocationsReady || allocationsFetching) {
        return;
      }

      start({
        ...registrationCallbacks(),
        reuse: reuseIntent ?? null,
      });

      const route =
        reuseIntent !== undefined
          ? userType === 'internal'
            ? '/unit/internal/availability'
            : '/unit/external/availability'
          : userType === 'internal'
            ? '/unit/internal/vehicle'
            : '/unit/external/vehicle';
      if (replace) {
        router.replace(route);
      } else {
        router.push(route);
      }
    },
    [allocationsFetching, allocationsReady, hasActiveWork, registrationCallbacks, start, userType],
  );

  useEffect(() => {
    if ((!isOnboarding && !isAccepting) || extendOnly || userType === null) {
      return;
    }
    if (hasActiveWork) {
      router.replace('/?openWork=1');
      return;
    }
    if (!allocationsReady || allocationsFetching) {
      return;
    }
    if (registrationStarted.current) {
      return;
    }

    if (!reuseLast) {
      registrationStarted.current = true;
      openRegistration(true);
      return;
    }

    if (worker === undefined) {
      return;
    }

    registrationStarted.current = true;
    let cancelled = false;
    void (async () => {
      const stored = await lastUnitPreference.load();
      let fleetTruckIds: ReadonlySet<string> | undefined;
      if (userType === 'internal') {
        const fleet = await unitService.getFleet();
        fleetTruckIds = new Set(fleet.map((vehicle) => vehicle.id));
      }
      const matched =
        worker === null
          ? null
          : matchLastUnitSnapshot(stored, {
              workerId: worker.dn_workerid,
              userType,
              fleetTruckIds,
            });
      if (cancelled) {
        return;
      }
      if (matched === null) {
        openRegistration(true);
        return;
      }
      openRegistration(true, toUnitReuseIntent(matched));
    })();
    return () => {
      cancelled = true;
      registrationStarted.current = false;
    };
  }, [
    allocationsFetching,
    allocationsReady,
    extendOnly,
    hasActiveWork,
    isAccepting,
    isOnboarding,
    lastUnitPreference,
    openRegistration,
    reuseLast,
    unitService,
    userType,
    worker,
  ]);

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
