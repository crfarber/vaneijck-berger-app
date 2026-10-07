import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/ui/theme';
import {
  PHOTO_CATEGORY,
  PHOTO_CATEGORY_LABEL,
  PHOTO_ROLE,
  photoPositionFromRouteParam,
  photoPhaseFromServiceStatus,
  simplePhotoPosition,
  isPhotoCategory,
  standGridIndex,
  type PhotoPosition,
} from '../index';
import { MandatoryPhotoHelpPopup } from '../components/mandatory-photo-help-popup';
import { PhotoCamera } from '../components/photo-camera';
import { useServicePhotos } from '../hooks/use-service-photos';
import type { PhotoCaptureMode, PhotoFlowContext } from './photo-flow';

export function PhotoCaptureScreen({
  allocationId,
  serviceId,
  incidentId,
  serviceStatuscode,
  phaseNumbers,
  mode: modeParam,
  category: categoryParam,
  position: positionParam,
  help: helpParam,
  overrideExisting = false,
  isExtraOverride,
  replacePhotoId,
}: PhotoFlowContext & {
  mode: string;
  category?: string;
  position?: string;
  help?: string;
  overrideExisting?: boolean;
  isExtraOverride?: boolean;
  replacePhotoId?: string;
}) {
  const { t } = useTranslation();
  const { capture } = useServicePhotos(serviceId);
  const mode: PhotoCaptureMode = modeParam === 'mandatory' ? 'mandatory' : 'extra';
  const category =
    categoryParam && isPhotoCategory(categoryParam) ? categoryParam : PHOTO_CATEGORY.DASHBOARD;
  const routedPosition = photoPositionFromRouteParam(positionParam);
  const position = routedPosition ?? (mode === 'mandatory' ? simplePhotoPosition(category) : null);
  const highlightedIndex = position ? standGridIndex(position) : null;
  const [helpVisible, setHelpVisible] = useState(helpParam === '1');
  const routeParams = {
    id: allocationId,
    serviceId,
    incidentId,
    statuscode: String(serviceStatuscode),
    ...(phaseNumbers !== undefined && phaseNumbers.length > 0
      ? { phaseNumbers: phaseNumbers.join(',') }
      : {}),
  };
  const label =
    mode === 'mandatory' && position !== null ? captureLabel(position) : t('photos.extraPhoto');

  useEffect(() => {
    if (position === null) {
      router.back();
    }
  }, [position]);

  if (position === null) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerChip}>
              <Text style={styles.headerChipText}>{label}</Text>
            </View>
          ),
        }}
      />
      <PhotoCamera
        onCapture={async (sourceUri) => {
          if (helpVisible) return;
          await capture({
            incidentId,
            allocationId,
            phase: photoPhaseFromServiceStatus(serviceStatuscode, phaseNumbers),
            role: mode === 'mandatory' ? PHOTO_ROLE.mandatory : PHOTO_ROLE.additional,
            position,
            sourceUri,
            overrideExisting,
            isExtraOverride,
            replacePhotoId,
          });
          router.navigate({
            pathname: '/allocations/[id]/services/[serviceId]/photos',
            params: routeParams,
          });
        }}
        overlay={
          mode === 'mandatory' && !helpVisible ? (
            <View style={styles.hint}>
              <View style={styles.hintGrid}>
                {Array.from({ length: 9 }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.hintCell,
                      index === 4 && styles.hintVehicle,
                      highlightedIndex === index && styles.hintTarget,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.hintText}>
                {t('photos.cameraHint', {
                  area: captureLabel(position).toLocaleLowerCase(),
                })}
              </Text>
            </View>
          ) : undefined
        }
      />
      {helpVisible ? (
        <MandatoryPhotoHelpPopup position={position} onContinue={() => setHelpVisible(false)} />
      ) : null}
    </View>
  );
}

function captureLabel(position: PhotoPosition): string {
  if (position.category === 'EXTERIOR') return position.angle;
  if (position.category === 'TYRES') return position.tyre;
  return PHOTO_CATEGORY_LABEL[position.category];
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerChip: {
    borderRadius: 14,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerChipText: { color: colors.brandText, fontSize: 13, fontWeight: '800' },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 8,
  },
  hintGrid: { width: 30, height: 30, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  hintCell: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  hintVehicle: { backgroundColor: colors.background, borderColor: colors.background },
  hintTarget: { backgroundColor: colors.brand, borderColor: colors.brand },
  hintText: { color: colors.background, fontSize: 11, fontWeight: '700' },
});
