import { Redirect, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ExtendShiftScreen } from '@/domeinen/allocation-unit/ui';
import { hasActiveAllocations } from '@/domeinen/allocations';
import { AllocationsScreen, useAllocations } from '@/domeinen/allocations/ui';
import { useSession } from '@/domeinen/auth/ui';
import { usePermissionDisclosureGate } from '@/domeinen/settings/ui';
import { colors } from '@/shared/ui/theme';
import { AllocationsToolbar } from '../components/allocations-toolbar';
import { clearNoValidUnitContinueNotice } from '../domain/no-valid-unit-continue-notice';
import { clearRegisterUnitNotice } from '../domain/register-unit-notice';
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
  const { sections } = useAllocations();
  const activeWork = hasActiveAllocations(sections);
  const step = gate.status === 'ready' ? gate.step : null;
  const notice = gate.status === 'ready' ? gate.notice : 'none';

  useScreenTitle(
    step === 'allocations' || step === null
      ? t('allocations.title')
      : step === 'extend-shift'
        ? t('unit.extendShiftTitle')
        : t('unit.registerTitle'),
  );

  useEffect(() => {
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
    if (notice === 'register-unit') {
      showRegisterUnitAlert(registerUnitAlertTexts(t), () => {
        router.push('/unit?mode=onboarding');
      });
      return;
    }
    if (notice === 'no-valid-unit-continue') {
      showNoValidUnitContinueAlert(noValidUnitContinueAlertTexts(t));
    }
  }, [disclosure, gate.status, notice, t, userType]);

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

  switch (gate.step) {
    case 'allocations':
      return (
        <AllocationsScreen
          toolbar={
            <AllocationsToolbar
              hasActiveAllocations={activeWork}
              canReportIssue={userType === 'internal'}
            />
          }
        />
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
