import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { CameraSVG } from '@/shared/ui/icons/camera';
import CheckIcon from '@/shared/ui/icons/check';
import { CarSVG, MotorcycleSVG, TruckSVG } from '@/shared/ui/icons/vehicles';
import { colors, radius, spacing, type } from '@/shared/ui/theme';
import {
  PHOTO_CATEGORY_LABEL,
  PHOTO_PHASE,
  PHOTO_STATUS,
  missingPhotoPositions,
  photoPositionForRequirement,
  photoPositionToRouteParam,
  photoPhaseFromServiceStatus,
  photoTypeKey,
  standGridIndex,
  unmatchedLoadPhotos,
  type PhotoPosition,
  type PhotoStatus,
  type ServerPhotoSummary,
} from '../index';
import { useServicePhotos } from '../hooks/use-service-photos';
import { usePhotoService } from '../hooks/photos-context';
import type { PhotoFlowContext } from './photo-flow';
import { Screen } from '@/shared/ui/screen';

const VEHICLE_TYPES = [
  { key: 'AUTO', label: 'Auto', Icon: CarSVG },
  { key: 'TRUCK', label: 'Truck', Icon: TruckSVG },
  { key: 'MOTORCYCLE', label: 'Motorfiets', Icon: MotorcycleSVG },
  { key: 'OTHER', label: 'Anders', Icon: null },
] as const;

type VehicleType = (typeof VEHICLE_TYPES)[number]['key'];
type OverviewPhoto = { id: string; position: PhotoPosition; status: PhotoStatus; uri: string };

export function PhotoOverviewScreen({
  allocationId,
  serviceId,
  incidentId,
  serviceStatuscode,
  mandatoryNames,
  loadMandatoryNames,
}: PhotoFlowContext & {
  mandatoryNames: readonly string[] | null;
  loadMandatoryNames: readonly string[] | null;
}) {
  const { t } = useTranslation();
  const phase = photoPhaseFromServiceStatus(serviceStatuscode);
  const photoService = usePhotoService();
  const { photos, loaded, loadFailed, retry, busy } = useServicePhotos(serviceId);
  const [vehicleType, setVehicleType] = useState<VehicleType>('AUTO');
  const [serverPhotos, setServerPhotos] = useState<ServerPhotoSummary[]>([]);
  const [serverLoadPhotos, setServerLoadPhotos] = useState<ServerPhotoSummary[]>([]);
  const [lookupFailed, setLookupFailed] = useState(false);
  const phasePhotos = photos.filter((photo) => photo.phase === phase);
  const loadPhotos = photos.filter((photo) => photo.phase === PHOTO_PHASE.load);

  useEffect(() => {
    if (!loaded || !incidentId) return;
    let active = true;
    const fetchMissing = async (): Promise<void> => {
      try {
        const [current, load] = await Promise.all([
          phasePhotos.length === 0
            ? photoService.listServerPhotos({ allocationId, incidentId, serviceId, phase })
            : Promise.resolve([]),
          phase === PHOTO_PHASE.delivery && loadPhotos.length === 0
            ? photoService.listServerPhotos({
                allocationId,
                incidentId,
                serviceId,
                phase: PHOTO_PHASE.load,
              })
            : Promise.resolve([]),
        ]);
        if (active) {
          setServerPhotos(current.filter((photo) => photo.phase === phase));
          setServerLoadPhotos(load.filter((photo) => photo.phase === PHOTO_PHASE.load));
          setLookupFailed(false);
        }
      } catch {
        if (active) setLookupFailed(true);
      }
    };
    void fetchMissing();
    return () => {
      active = false;
    };
  }, [
    loaded,
    allocationId,
    incidentId,
    serviceId,
    phase,
    photoService,
    phasePhotos.length,
    loadPhotos.length,
  ]);

  const currentPhotos: OverviewPhoto[] = phasePhotos.map((photo) => ({
    id: photo.id,
    position: photo.position,
    status: photo.status,
    uri: photo.displayUri,
  }));
  if (phasePhotos.length === 0) {
    currentPhotos.push(
      ...serverPhotos.map((photo, index) => ({
        id: `server-${index}`,
        position: photo.position,
        status: PHOTO_STATUS.sent,
        uri: photo.url,
      })),
    );
  }
  const loadPositions =
    loadPhotos.length > 0
      ? loadPhotos
          .filter((photo) => photo.status !== PHOTO_STATUS.failed)
          .map((photo) => photo.position)
      : serverLoadPhotos.map((photo) => photo.position);
  const loadRequiredPositions = loadMandatoryNames?.map(photoPositionForRequirement) ?? [];
  const requiredPositions = mandatoryNames?.map(photoPositionForRequirement) ?? [];
  const definitionsValid =
    mandatoryNames !== null &&
    loadMandatoryNames !== null &&
    !requiredPositions.includes(null) &&
    !loadRequiredPositions.includes(null);
  const requirements = [
    ...requiredPositions.filter((position) => position !== null),
    ...(phase === PHOTO_PHASE.delivery
      ? unmatchedLoadPhotos(
          loadPositions,
          loadRequiredPositions.filter((position) => position !== null),
        )
      : []),
  ];
  const usablePhotos = currentPhotos.filter((photo) => photo.status !== PHOTO_STATUS.failed);
  const remainingPhotos = [...usablePhotos];
  const mandatoryPhotos = requirements.map((position) => {
    const index = remainingPhotos.findIndex(
      (photo) => photoTypeKey(photo.position) === photoTypeKey(position),
    );
    return { position, photo: index < 0 ? null : (remainingPhotos.splice(index, 1)[0] ?? null) };
  });
  const extraPhotos = remainingPhotos;
  const missingRequired = missingPhotoPositions(
    requirements,
    usablePhotos.map((photo) => photo.position),
  ).length;
  const canLeave =
    loaded &&
    definitionsValid &&
    !lookupFailed &&
    !loadFailed &&
    missingRequired === 0 &&
    currentPhotos.every((photo) => photo.status !== PHOTO_STATUS.failed);
  const routeParams = {
    id: allocationId,
    serviceId,
    incidentId,
    statuscode: String(serviceStatuscode),
  };

  const openMandatoryPhoto = (position: PhotoPosition): void => {
    if (standGridIndex(position) !== null) {
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]/photos/camera',
        params: {
          ...routeParams,
          mode: 'mandatory',
          category: position.category,
          position: photoPositionToRouteParam(position),
          help: '1',
        },
      });
      return;
    }
    if (position.category === 'EXTERIOR' || position.category === 'TYRES') {
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]/photos/camera',
        params: { ...routeParams, mode: 'extra', position: photoPositionToRouteParam(position) },
      });
      return;
    }
    router.push({
      pathname: '/allocations/[id]/services/[serviceId]/photos/camera',
      params: { ...routeParams, mode: 'mandatory', category: position.category },
    });
  };

  const openExtraPhotoPosition = (): void => {
    router.push({
      pathname: '/allocations/[id]/services/[serviceId]/photos/position',
      params: routeParams,
    });
  };

  const primaryButtonLabel =
    missingRequired > 0
      ? t('photos.remainingMandatory', { count: missingRequired })
      : t('photos.send');

  return (
    <Screen
      footer={
        <>
          {lookupFailed || loadFailed ? (
            <Text style={styles.counterText}>{t('common.somethingWrong')}</Text>
          ) : null}
          <Button label={primaryButtonLabel} onPress={() => router.back()} disabled={!canLeave} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </>
      }
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.segmentedContainer}>
          {VEHICLE_TYPES.map(({ key, label, Icon }) => {
            const selected = vehicleType === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => setVehicleType(key)}
                style={[styles.segmentedOption, selected && styles.segmentedOptionSelected]}
              >
                {Icon ? (
                  <Icon size={22} color={selected ? colors.text : colors.textMuted} />
                ) : (
                  <View style={styles.otherPill}>
                    <Text style={styles.otherPillText}>?</Text>
                  </View>
                )}
                <Text
                  style={[styles.segmentedText, selected && styles.segmentedTextSelected]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {phase === PHOTO_PHASE.delivery &&
        (loadPhotos.length > 0 || serverLoadPhotos.length > 0) ? (
          <>
            <SectionHeader
              label={t('photos.loadReference')}
              count={t('photos.extraCount', {
                count: loadPhotos.length || serverLoadPhotos.length,
              })}
            />
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.loadStrip}
              contentContainerStyle={styles.loadStripContent}
            >
              {loadPhotos.length > 0
                ? loadPhotos.map((photo) => (
                    <ExtraPhotoTile
                      key={photo.id}
                      variant="strip"
                      photo={{
                        id: photo.id,
                        position: photo.position,
                        status: photo.status,
                        uri: photo.displayUri,
                      }}
                    />
                  ))
                : serverLoadPhotos.map((photo, index) => (
                    <ExtraPhotoTile
                      key={`load-server-${index}`}
                      variant="strip"
                      photo={{
                        id: `load-server-${index}`,
                        position: photo.position,
                        status: PHOTO_STATUS.sent,
                        uri: photo.url,
                      }}
                    />
                  ))}
            </ScrollView>
          </>
        ) : null}
        <SectionHeader
          label={t('photos.mandatory')}
          count={t('photos.mandatoryCount', {
            count: mandatoryPhotos.filter((entry) => entry.photo !== null).length,
          })}
        />
        <View style={styles.gridTwo}>
          {mandatoryPhotos.map(({ position, photo }, index) => (
            <MandatoryPhotoTile
              key={`${photoTypeKey(position)}-${index}`}
              position={position}
              photo={photo}
              onPress={() => openMandatoryPhoto(position)}
            />
          ))}
        </View>
        <SectionHeader
          label={t('photos.extra')}
          count={t('photos.extraCount', { count: extraPhotos.length })}
        />
        <View style={styles.gridThree}>
          {extraPhotos.map((photo) => (
            <ExtraPhotoTile key={photo.id} photo={photo} />
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={openExtraPhotoPosition}
            style={styles.addTile}
          >
            <CameraSVG size={26} color={colors.textMuted} />
            <Text style={styles.addTileText}>{t('photos.extraPhoto')}</Text>
          </Pressable>
        </View>
        <View style={styles.footer}>
          {photos.some((photo) => photo.status === PHOTO_STATUS.failed && photo.phase === phase) ? (
            <Button
              label={t('photos.retry')}
              variant="secondary"
              disabled={busy}
              onPress={() => {
                void (async () => {
                  for (const photo of photos) {
                    if (photo.phase === phase && photo.status === PHOTO_STATUS.failed) {
                      await retry(photo.id);
                    }
                  }
                })();
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ label, count }: { label: string; count: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.counterText} numberOfLines={1}>
        {count}
      </Text>
    </View>
  );
}

function MandatoryPhotoTile({
  position,
  photo,
  onPress,
}: {
  position: PhotoPosition;
  photo: OverviewPhoto | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const state =
    photo === null || photo.status === PHOTO_STATUS.failed
      ? 'todo'
      : photo.status === PHOTO_STATUS.sent
        ? 'uploaded'
        : 'done';
  const highlightedIndex = standGridIndex(position);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.requiredTile, state === 'done' && styles.requiredTileDone]}
    >
      {state === 'todo' ? (
        <>
          <View style={styles.requiredGrid}>
            {Array.from({ length: 9 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.requiredGridCell,
                  index === 4 && styles.requiredGridCellCenter,
                  highlightedIndex === index ? styles.requiredGridCellActive : null,
                ]}
              />
            ))}
          </View>
          <TileFooter label={positionName(position)} required />
        </>
      ) : (
        <>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.tileImage} resizeMode="cover" />
          ) : null}
          <View style={styles.tileTopBadgeRow}>
            {state === 'uploaded' ? (
              <View style={styles.uploadBadge}>
                <Text style={styles.uploadBadgeText}>{t('photos.uploaded')}</Text>
              </View>
            ) : (
              <View style={styles.checkBadge}>
                <CheckIcon size={14} color={colors.background} />
              </View>
            )}
            <View style={styles.retakeBadge}>
              <Text style={styles.retakeBadgeText}>{t('photos.retake')}</Text>
            </View>
          </View>
          <TileFooter label={positionName(position)} />
        </>
      )}
    </Pressable>
  );
}

function TileFooter({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <View style={styles.requiredTileFooter}>
      <Text style={styles.requiredTileLabel}>{label}</Text>
      {required ? <View style={styles.requiredDot} /> : null}
    </View>
  );
}

function ExtraPhotoTile({
  photo,
  variant = 'grid',
}: {
  photo: OverviewPhoto;
  variant?: 'grid' | 'strip';
}) {
  const strip = variant === 'strip';
  return (
    <View style={[styles.extraTile, strip && styles.stripTile]}>
      <Image
        source={{ uri: photo.uri }}
        style={[styles.extraImage, strip && styles.stripImage]}
        resizeMode="cover"
      />
      <View style={[styles.extraFooter, styles.extraFooterPositioned, strip && styles.stripFooter]}>
        <Text style={[styles.extraFooterText, strip && styles.stripFooterText]} numberOfLines={1}>
          {positionName(photo.position)}
        </Text>
      </View>
    </View>
  );
}

function positionName(position: PhotoPosition): string {
  if (position.category === 'EXTERIOR') return position.angle;
  if (position.category === 'TYRES') return position.tyre;
  return PHOTO_CATEGORY_LABEL[position.category];
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F8' },
  content: { paddingTop: 8, paddingBottom: 24, gap: 12 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 5,
    gap: 6,
  },
  segmentedOption: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  segmentedOptionSelected: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentedText: { color: colors.textMuted, fontWeight: '700', fontSize: 11.5 },
  segmentedTextSelected: { color: colors.text },
  otherPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherPillText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  header: {
    gap: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brandDark,
    borderRadius: radius.md,
  },
  sectionLabel: {
    ...type.label,
    color: colors.brandLight,
  },
  counterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  gridTwo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  requiredTile: {
    width: '48.5%',
    height: 118,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.text,
    backgroundColor: '#FAFAFB',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  requiredTileDone: { borderColor: colors.border, backgroundColor: colors.background },
  requiredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 44,
    height: 44,
    alignSelf: 'center',
    marginTop: 18,
    gap: 2,
  },
  requiredGridCell: {
    width: 12,
    height: 12,
    backgroundColor: '#F2F3F4',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requiredGridCellCenter: { backgroundColor: colors.text, borderColor: colors.text },
  requiredGridCellActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  requiredTileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 36,
    backgroundColor: '#F6F6F6',
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9EBEE',
  },
  requiredTileLabel: { color: colors.text, fontSize: 11.5, fontWeight: '700' },
  requiredDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  tileImage: { width: '100%', height: 82, backgroundColor: colors.border },
  tileTopBadgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBadge: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  uploadBadgeText: { color: colors.text, fontSize: 9.5, fontWeight: '700' },
  retakeBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  retakeBadgeText: { color: colors.background, fontSize: 9.5, fontWeight: '700' },
  gridThree: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loadStrip: {
    marginHorizontal: -spacing.md,
  },
  loadStripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  extraTile: {
    width: '33.2%',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  stripTile: {
    width: '50%',
    height: 112,
  },
  extraImage: { width: '100%', height: 70, backgroundColor: '#E7E8EA' },
  stripImage: { height: 82, backgroundColor: '#222428' },
  extraFooter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  extraFooterPending: { backgroundColor: '#FEEB8C' },
  extraFooterPositioned: { backgroundColor: colors.surface },
  stripFooter: { backgroundColor: '#111315' },
  extraFooterText: { color: colors.text, fontSize: 10.5, fontWeight: '700' },
  stripFooterText: { color: colors.background },
  addTile: {
    width: '31.2%',
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C9CDD2',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addTileText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  footer: { gap: 8, marginTop: 12 },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
