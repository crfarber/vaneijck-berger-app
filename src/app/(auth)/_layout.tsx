import { Stack } from 'expo-router';
import { mapBackgroundScreenLayout } from '@/shared/ui/map-background';

export default function AuthLayout() {
  return <Stack screenLayout={mapBackgroundScreenLayout} screenOptions={{ headerShown: false }} />;
}
