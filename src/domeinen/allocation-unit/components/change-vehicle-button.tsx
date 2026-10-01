import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { confirm } from '@/shared/ui/confirm';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { colors } from '@/shared/ui/theme';
import { decideChangeVehicle } from '../domain/change-vehicle';
import type { ReregisterReason } from '../domain/reregister';
import { useAllocationUnitService } from '../hooks/allocation-unit-context';
import {
  noUnitDispatchAlertTexts,
  showNoUnitDispatchAlert,
} from '../hooks/show-no-unit-dispatch-alert';
import { TowTruckSVG } from '@/shared/ui/icons/vehicles';

const CONFIRM_MESSAGE_KEY = {
  'no-unit': 'unit.changeVehicle.confirmNoUnit',
  'no-vehicle': 'unit.changeVehicle.confirmNoVehicle',
} as const satisfies Record<
  Exclude<ReregisterReason, 'expired'>,
  'unit.changeVehicle.confirmNoUnit' | 'unit.changeVehicle.confirmNoVehicle'
>;

/**
 * Lets the berger change their truck/trailer from the allocations toolbar. Uses the same
 * `decideReregister` outcome as the onboarding gate, plus an active-work guard for ACTIVE_INCIDENT.
 */
export function ChangeVehicleButton({ hasActiveAllocations }: { hasActiveAllocations: boolean }) {
  const { t } = useTranslation();
  const service = useAllocationUnitService();
  const [busy, setBusy] = useState(false);

  const openUnit = (): void => {
    router.push('/unit');
  };

  const openExtendShift = (): void => {
    router.push('/unit?mode=extend');
  };

  const onPress = async (): Promise<void> => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const outcome = await service.checkReregister(hasActiveAllocations);
      const decision = decideChangeVehicle(outcome, hasActiveAllocations);
      switch (decision.action) {
        case 'call-dispatch':
          showNoUnitDispatchAlert(noUnitDispatchAlertTexts(t));
          break;
        case 'alert':
          Alert.alert(
            t(
              decision.reason === 'active-work'
                ? 'unit.changeVehicle.activeWorkTitle'
                : 'unit.changeVehicle.finishFirstTitle',
            ),
            t(
              decision.reason === 'active-work'
                ? 'unit.changeVehicle.activeWorkMessage'
                : 'unit.changeVehicle.finishFirstMessage',
            ),
            [{ text: t('common.ok') }],
          );
          break;
        case 'confirm-then-register': {
          const accepted = await confirm({
            title: t('unit.changeVehicle.confirmTitle'),
            message: t(CONFIRM_MESSAGE_KEY[decision.reason]),
            confirmLabel: t('unit.changeVehicle.confirmOk'),
            cancelLabel: t('common.cancel'),
          });
          if (accepted) {
            openUnit();
          }
          break;
        }
        case 'extend-shift':
          openExtendShift();
          break;
        case 'register':
          openUnit();
          break;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolbarButton accessibilityLabel={t('toolbar.changeVehicle')} onPress={() => void onPress()}>
      <TowTruckSVG size={24} color={colors.background} />
    </ToolbarButton>
  );
}
