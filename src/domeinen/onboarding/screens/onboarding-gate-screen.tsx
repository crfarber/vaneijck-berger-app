import { Redirect, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import {
  ExtendShiftScreen,
  matchLastUnitSnapshot,
  useAllocationUnitService,
  useLastUnitPreference,
} from '@/domeinen/allocation-unit/ui';
import type { LastUnitSnapshot } from '@/domeinen/allocation-unit';
import { createAllocationSections, hasActiveAllocations } from '@/domeinen/allocations';
import { AllocationsScreen, useAllocations } from '@/domeinen/allocations/ui';
import { useSession } from '@/domeinen/auth/ui';
import { usePermissionDisclosureGate } from '@/domeinen/settings/ui';
import { useWorker } from '@/domeinen/worker/ui';
import { colors } from '@/shared/ui/theme';
import { AllocationsToolbar } from '../components/allocations-toolbar';
import { RegisterUnitPromptSheet } from '../components/register-unit-prompt-sheet';
import { clearNoValidUnitContinueNotice } from '../domain/no-valid-unit-continue-notice';
import { claimRegisterUnitNotice, clearRegisterUnitNotice } from '../domain/register-unit-notice';
import {
  noValidUnitContinueAlertTexts,
  showNoValidUnitContinueAlert,
} from '../hooks/show-no-valid-unit-continue-alert';
import { registerUnitAlertTexts, showRegisterUnitAlert } from '../hooks/show-register-unit-alert';
import { useOnboardingGate } from '../hooks/use-onboarding-gate';

/** The layout sets a static title for this route; keep it matching whichever screen the gate shows. */
function useScreenTitle(title: string): void {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);
}

/** Entry point of the signed-in app: decides between the assignments list and unit registration. */
export function OnboardingGateScreen() {
  const { t } = useTranslation();
  const { openWork } = useLocalSearchParams<{ openWork?: string }>();
  const disclosure = usePermissionDisclosureGate();
  const gate = useOnboardingGate({ reportedOpenWork: openWork === '1' });
  const userType = useSession((state) => state.userType);
  const { sections, refetch } = useAllocations();
  const activeWork = hasActiveAllocations(sections);
  const lastUnitPreference = useLastUnitPreference();
  const unitService = useAllocationUnitService();
  const { data: worker } = useWorker();
  const [reuseSnapshot, setReuseSnapshot] = useState<LastUnitSnapshot | null>(null);
  const step = gate.status === 'ready' ? gate.step : null;
  const notice = gate.status === 'ready' ? gate.notice : 'none';

  const openRegistration = useCallback(
    async (reuseLast: boolean): Promise<void> => {
      if (activeWork || notice !== 'register-unit') {
        return;
      }
      const [allocations] = await refetch();
      if (!allocations.isSuccess || allocations.data === undefined) {
        Alert.alert(t('common.somethingWrong'));
        return;
      }
      if (hasActiveAllocations(createAllocationSections(allocations.data, []))) {
        setReuseSnapshot(null);
        showNoValidUnitContinueAlert(noValidUnitContinueAlertTexts(t));
        return;
      }
      setReuseSnapshot(null);
      router.push(reuseLast ? '/unit?mode=onboarding&reuse=last' : '/unit?mode=onboarding');
    },
    [activeWork, notice, refetch, t],
  );

  useScreenTitle(
    step === 'allocations' || step === null
      ? t('allocations.title')
      : step === 'extend-shift'
        ? t('unit.extendShiftTitle')
        : t('unit.registerTitle'),
  );

  const reuseSnapshotStale = userType === null || notice !== 'register-unit' || activeWork;
  if (reuseSnapshotStale && reuseSnapshot !== null) {
    setReuseSnapshot(null);
  }

  useEffect(() => {
    let cancelled = false;
    if (userType === null) {
      clearNoValidUnitContinueNotice();
      clearRegisterUnitNotice();
      return;
    }
    // Wait for the permission wizard; otherwise a register-unit alert would fire under the redirect.
    if (disclosure !== 'done') {
      return;
    }
    // Only clear when the gate is ready without a notice. While `checking`, notice is forced to
    // `'none'` and must not re-arm the alert, or a query-key flicker would show it again.
    if (gate.status === 'ready' && notice === 'none') {
      clearNoValidUnitContinueNotice();
      clearRegisterUnitNotice();
      return;
    }
    if (notice === 'register-unit' && !activeWork) {
      if (worker === undefined) {
        return;
      }
      void (async () => {
        const stored = await lastUnitPreference.load();
        if (cancelled) {
          return;
        }
        let fleetTruckIds: ReadonlySet<string> | undefined;
        if (userType === 'internal') {
          const fleet = await unitService.getFleet();
          fleetTruckIds = new Set(fleet.map((vehicle) => vehicle.id));
        }
        if (cancelled) {
          return;
        }
        const matched =
          worker === null
            ? null
            : matchLastUnitSnapshot(stored, {
                workerId: worker.dn_workerid,
                userType,
                fleetTruckIds,
              });
        if (matched !== null) {
          if (!claimRegisterUnitNotice()) {
            return;
          }
          setReuseSnapshot(matched);
          return;
        }
        showRegisterUnitAlert(registerUnitAlertTexts(t), () => {
          if (!cancelled) {
            void openRegistration(false);
          }
        });
      })().catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }
    if (notice === 'no-valid-unit-continue') {
      showNoValidUnitContinueAlert(noValidUnitContinueAlertTexts(t));
    }
  }, [
    activeWork,
    disclosure,
    gate.status,
    lastUnitPreference,
    notice,
    openRegistration,
    t,
    unitService,
    userType,
    worker,
  ]);

  if (disclosure === 'checking' || gate.status === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (disclosure === 'needed') {
    return <Redirect href="/permission-disclosure" />;
  }

  const closeReuseSheet = (): void => {
    setReuseSnapshot(null);
  };

  switch (gate.step) {
    case 'allocations':
      return (
        <>
          <AllocationsScreen
            toolbar={
              <AllocationsToolbar
                hasActiveAllocations={activeWork}
                canReportIssue={userType === 'internal'}
              />
            }
          />
          {reuseSnapshot !== null && notice === 'register-unit' && !activeWork ? (
            <RegisterUnitPromptSheet
              visible
              snapshot={reuseSnapshot}
              onUseThis={() => {
                void openRegistration(true);
              }}
              onChooseOther={() => {
                void openRegistration(false);
              }}
              onDismiss={closeReuseSheet}
            />
          ) : null}
        </>
      );
    case 'register-external-unit':
    case 'register-internal-unit':
      return <Redirect href="/unit?mode=onboarding" />;
    case 'extend-shift':
      return <ExtendShiftScreen onExtended={gate.recheck} onOpenWork={gate.reportOpenWork} />;
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
