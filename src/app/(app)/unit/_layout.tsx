import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { UnitRegistrationFlowProvider } from '@/domeinen/allocation-unit/ui';
import { colors } from '@/shared/ui/theme';

export default function UnitLayout() {
  const { t } = useTranslation();

  return (
    <UnitRegistrationFlowProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.brand },
          headerBackButtonDisplayMode: 'minimal',
          headerTitleAlign: 'center',
          headerRight: () => null,
          title: t('unit.registerTitle'),
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
