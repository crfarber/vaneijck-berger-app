import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { allocationUnitKeys, useCurrentUnitOverview } from '@/domeinen/allocation-unit/ui';
import { hasActiveAllocations, useAllocations } from '@/domeinen/allocations/ui';
import { onboardingGateKey } from '@/domeinen/onboarding/ui';
import {
  AllocationUnitManagementScreen,
  useAllocationUnitManagement,
} from '@/domeinen/settings/ui';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';

export default function AllocationUnitManagementRoute() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const management = useAllocationUnitManagement();
  const unit = useCurrentUnitOverview();
  const { sections } = useAllocations();
  const [cancelling, setCancelling] = useState(false);
  const hasUnit = unit.data !== null && unit.data !== undefined;
  const hasActiveWork = hasActiveAllocations(sections);

  const cancelUnit = async (): Promise<void> => {
    setCancelling(true);
    try {
      let blockedByActiveWork = false;
      await statusOverlay.run(t('feedback.processing.cancelUnit'), async () => {
        const result = await management.cancelUnit();
        if (!result.ok) {
          if (result.error === 'active-work') {
            blockedByActiveWork = true;
            return { tone: 'none' };
          }
          return { tone: 'error', message: t('settings.allocationUnitManagement.cancelFailed') };
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: allocationUnitKeys.current() }),
          queryClient.invalidateQueries({ queryKey: onboardingGateKey }),
        ]);
        return { tone: 'none' };
      });
      if (blockedByActiveWork) {
        Alert.alert(
          t('settings.allocationUnitManagement.activeWorkTitle'),
          t('settings.allocationUnitManagement.activeWorkMessage'),
          [{ text: t('common.ok') }],
        );
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AllocationUnitManagementScreen
      hasUnit={hasUnit}
      hasActiveWork={hasActiveWork}
      cancelling={cancelling}
      onCancel={() => void cancelUnit()}
    />
  );
}
