import { Stack } from 'expo-router';
import { colors } from '@/shared/ui/theme';
import { SettingsHeaderButton } from '@/domeinen/settings/ui';
import { WorkerStatusPill } from '@/domeinen/worker/ui';
import { mapBackgroundScreenLayout } from '@/shared/ui/map-background';

export default function PhotosLayout() {
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
      <Stack.Screen name="mandatory" />
      <Stack.Screen name="position" />
      <Stack.Screen
        name="camera"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
          headerTintColor: colors.background,
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => null,
        }}
      />
      <Stack.Screen name="sent" options={{ headerShown: false }} />
    </Stack>
  );
}
