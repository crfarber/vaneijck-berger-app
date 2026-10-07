import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { Button } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { colors, spacing } from '@/shared/ui/theme';
import { photoPositionToRouteParam, type PhotoPosition } from '../index';
import { PhotoPositionPicker } from '../components/photo-position-picker';
import type { PhotoFlowContext } from './photo-flow';

export function ExtraPhotoPositionScreen({
  allocationId,
  serviceId,
  incidentId,
  serviceStatuscode,
  phaseNumbers,
}: PhotoFlowContext) {
  const { t } = useTranslation();
  const [position, setPosition] = useState<PhotoPosition | null>(null);
  const routeParams = {
    id: allocationId,
    serviceId,
    incidentId,
    statuscode: String(serviceStatuscode),
    ...(phaseNumbers !== undefined && phaseNumbers.length > 0
      ? { phaseNumbers: phaseNumbers.join(',') }
      : {}),
  };

  return (
    <Screen
      backgroundColor={colors.background}
      footer={
        <Button
          label={t('photos.continue')}
          disabled={position === null}
          onPress={() => {
            if (position === null) {
              return;
            }
            router.push({
              pathname: '/allocations/[id]/services/[serviceId]/photos/camera',
              params: {
                ...routeParams,
                mode: 'extra',
                position: photoPositionToRouteParam(position),
              },
            });
          }}
        />
      }
    >
      <Text style={styles.description}>{t('photos.positionDescription')}</Text>
      <PhotoPositionPicker value={position} onChange={setPosition} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 20, marginBottom: spacing.sm },
});
