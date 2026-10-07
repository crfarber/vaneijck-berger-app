import { Stack, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UnitRegistrationFlowProvider } from '@/domeinen/allocation-unit/ui';
import { useAllocationAcceptFlow } from '@/domeinen/allocations/ui';
import { mapBackgroundScreenLayout } from '@/shared/ui/map-background';
import { defaultStackHeaderOptions } from '@/shared/ui/navigation';
import { SettingsHeaderButton } from '@/domeinen/settings/ui';
import { WorkerStatusPill } from '@/domeinen/worker/ui';

export default function UnitLayout() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const acceptFlow = useAllocationAcceptFlow();
  const [acceptToken] = useState(() => acceptFlow.getState().pending?.token ?? null);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        acceptFlow.getState().cancel(acceptToken);
      }),
    [acceptFlow, acceptToken, navigation],
  );

  return (
    <UnitRegistrationFlowProvider>
      <Stack
        screenLayout={mapBackgroundScreenLayout}
        screenOptions={{
          ...defaultStackHeaderOptions,
          headerTitle: () => <WorkerStatusPill />,
          headerRight: () => <SettingsHeaderButton />,
        }}
      >
        <Stack.Screen name="index" options={{ title: t('unit.overview.navigationTitle') }} />
        <Stack.Screen name="internal/vehicle" />
        <Stack.Screen name="internal/scan" options={{ title: t('unit.scanTruckTitle') }} />
        <Stack.Screen name="internal/trailer" />
        <Stack.Screen name="internal/availability" />
        <Stack.Screen name="internal/end-date" />
        <Stack.Screen name="external/vehicle" />
        <Stack.Screen name="external/availability" />
        <Stack.Screen name="external/end-date" />
      </Stack>
    </UnitRegistrationFlowProvider>
  );
}
