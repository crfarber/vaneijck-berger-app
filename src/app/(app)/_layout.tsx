import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SettingsHeaderButton } from '@/domeinen/settings/ui';
import { WorkerStatusPill } from '@/domeinen/worker/ui';
import { mapBackgroundScreenLayout } from '@/shared/ui/map-background';
import { colors } from '@/shared/ui/theme';

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenLayout={mapBackgroundScreenLayout}
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand },
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
        headerTitle: () => <WorkerStatusPill />,
        headerRight: () => <SettingsHeaderButton />,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="debug" options={{ title: t('debug.title'), headerTitle: undefined }} />
      <Stack.Screen
        name="settings"
        options={{
          headerRight: () => null,
        }}
      />
      <Stack.Screen
        name="language"
        options={{ title: t('settings.language.title'), headerTitle: undefined }}
      />
      <Stack.Screen
        name="support"
        options={{ title: t('support.title'), headerTitle: undefined }}
      />
      <Stack.Screen
        name="permissions"
        options={{ title: t('settings.permissions.title'), headerTitle: undefined }}
      />
      <Stack.Screen
        name="reference-data-sync"
        options={{ title: t('settings.referenceData.title'), headerTitle: undefined }}
      />
      <Stack.Screen
        name="availability"
        options={{
          title: t('worker.availability.change'),
          headerTitle: undefined,
          headerRight: () => null,
        }}
      />
      <Stack.Screen
        name="unit"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: t('notifications.title'),
          headerTitle: undefined,
          headerRight: () => null,
        }}
      />
      <Stack.Screen name="allocations/[id]/index" />
      <Stack.Screen name="allocations/[id]/services/[serviceId]" />
      <Stack.Screen
        name="allocations/[id]/services/[serviceId]/photos"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="allocations/[id]/services/[serviceId]/form"
        options={{
          headerTitle: () => <WorkerStatusPill />,
          headerRight: () => null,
        }}
      />
    </Stack>
  );
}
