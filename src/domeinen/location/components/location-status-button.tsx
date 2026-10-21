import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { colors } from '@/shared/ui/theme';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import LocationIcon from '@/shared/ui/icons/location';
import { gpsButtonVariant } from '../domain/gps-status';
import { useGpsStatus } from '../hooks/use-gps-status';
import { GpsStatusSheet } from './gps-status-sheet';

/**
 * GPS status tile for toolbars. Green when location permission is granted (even without a fix
 * yet); red otherwise. Opens a sheet with coordinates and refresh / maps / settings.
 * The allocations list no longer shows this — GPS lives on the map banner instead.
 */
export function LocationStatusButton() {
  const { t } = useTranslation();
  const gps = useGpsStatus();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <ToolbarButton
        accessibilityLabel={t('toolbar.gps')}
        variant={gpsButtonVariant(gps.status)}
        onPress={() => {
          setVisible(true);
          void gps.refresh({ showBusy: true });
        }}
      >
        <LocationIcon size={24} color={colors.background} />
      </ToolbarButton>
      <GpsStatusSheet visible={visible} onClose={() => setVisible(false)} gps={gps} />
    </>
  );
}
