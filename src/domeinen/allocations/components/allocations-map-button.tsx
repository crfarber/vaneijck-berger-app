import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGpsStatus } from '@/domeinen/location/ui';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { colors } from '@/shared/ui/theme';
import { useAllocations } from '../hooks/use-allocations';

/**
 * Opens the allocations overview map from the toolbar.
 * With assignments: green when GPS is known, red when not. Without assignments: default.
 * Always tappable (map works without GPS or assignments).
 */
export function AllocationsMapButton() {
  const { t } = useTranslation();
  const { sections } = useAllocations();
  const gps = useGpsStatus();

  const hasAllocations = useMemo(() => {
    const [active, pending] = sections;
    return active.data.length > 0 || pending.data.length > 0;
  }, [sections]);

  const variant = !hasAllocations ? 'default' : gps.coordinate !== null ? 'success' : 'alert';

  return (
    <ToolbarButton
      accessibilityLabel={t('allocations.map.open')}
      onPress={() => router.push('/allocations-map')}
      variant={variant}
    >
      <Ionicons name="map-outline" size={24} color={colors.background} />
    </ToolbarButton>
  );
}
