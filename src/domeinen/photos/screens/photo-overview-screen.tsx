import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { CollapsibleSectionHeader } from '@/shared/ui/collapsible-section-header';
import { CameraSVG } from '@/shared/ui/icons/camera';
import CheckIcon from '@/shared/ui/icons/check';
import { CarSVG, MotorcycleSVG, TruckSVG } from '@/shared/ui/icons/vehicles';
import { Toolbar, ToolbarSlot } from '@/shared/ui/toolbar';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { colors, spacing } from '@/shared/ui/theme';
import {
  PHOTO_CATEGORY_LABEL,
  PHOTO_PHASE,
  PHOTO_STATUS,
  deliveryPhotoRequirements,
  missingPhotoPositions,
  photoPositionForRequirement,
  photoPositionToRouteParam,
  photoPhaseFromServiceStatus,
  photoTypeKey,
  reconcileHistoryPositions,
  standGridIndex,
  type PhotoPosition,
  type PhotoRole,
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
type PhotoSectionKey = 'load' | 'mandatory' | 'extra';
type OverviewPhoto = {
  id: string;
  position: PhotoPosition;
  status: PhotoStatus;
  uri: string;
  role?: PhotoRole;
  source?: 'local' | 'server';
  isExtra?: boolean;
};

export function PhotoOverviewScreen({
  allocationId,
  serviceId,
  incidentId,
  serviceStatuscode,
  phaseNumbers,
  mandatoryNames,
  loadMandatoryNames,
}: PhotoFlowContext & {
  mandatoryNames: readonly string[] | null;
  loadMandatoryNames: readonly string[] | null;
}) {
  const { t } = useTranslation();
  const phase = photoPhaseFromServiceStatus(serviceStatuscode, phaseNumbers);
  const photoService = usePhotoService();
  const { photos, loaded, loadFailed, submitBatch, submitOverride, retry, busy } =
    useServicePhotos(serviceId);
  const [vehicleType, setVehicleType] = useState<VehicleType>('AUTO');
  const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<PhotoSectionKey>>(
    () => new Set(),
  );
  const [serverPhotos, setServerPhotos] = useState<ServerPhotoSummary[]>([]);
  const [serverLoadPhotos, setServerLoadPhotos] = useState<ServerPhotoSummary[]>([]);
  const [serverLookupComplete, setServerLookupComplete] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const phasePhotos = photos.filter((photo) => photo.phase === phase);
  const loadPhotos = photos.filter((photo) => photo.phase === PHOTO_PHASE.load);
  const phasePhotoVersion = phasePhotos.map((photo) => `${photo.id}:${photo.status}`).join('|');
  const loadPhotoVersion = loadPhotos.map((photo) => `${photo.id}:${photo.status}`).join('|');

  const toggleSection = (key: PhotoSectionKey): void => {
    setCollapsedSections((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!loaded || !incidentId) return;
    let active = true;
    const fetchMissing = async (): Promise<void> => {
      try {
        const [current, load] = await Promise.all([
          photoService.listServerPhotos({ allocationId, incidentId, serviceId, phase }),
          phase === PHOTO_PHASE.delivery
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
          setServerLookupComplete(true);
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
    phasePhotoVersion,
    loadPhotoVersion,
  ]);

  const localCurrentPhotos: OverviewPhoto[] = phasePhotos.map((photo) => ({
    id: photo.id,
    position: photo.position,
    status: photo.status,
    uri: photo.displayUri,
    role: photo.role,
    source: 'local',
    isExtra: photo.isExtraOverride,
  }));
  const serverCurrentPhotos: OverviewPhoto[] = serverPhotos.map((photo, index) => ({
    id: `server-${index}`,
    position: photo.position,
    status: PHOTO_STATUS.sent,
    uri: photo.url,
    source: 'server',
    isExtra: photo.isExtra,
  }));
  const includeLocalPhoto = (photo: OverviewPhoto): boolean =>
    photo.status !== PHOTO_STATUS.sent || !serverLookupComplete || serverPhotos.length === 0;
  const currentPhotos: OverviewPhoto[] = [
    ...localCurrentPhotos.filter(
      (photo) => photo.role !== 'additional' && includeLocalPhoto(photo),
    ),
    ...serverCurrentPhotos,
    ...localCurrentPhotos.filter(
      (photo) => photo.role === 'additional' && includeLocalPhoto(photo),
    ),
  ];
  const loadPositions = reconcileHistoryPositions(
    loadPhotos,
    serverLoadPhotos.map((photo) => photo.position),
    serverLookupComplete,
  );
  const loadRequiredPositions = loadMandatoryNames?.map(photoPositionForRequirement) ?? [];
  const requiredPositions = mandatoryNames?.map(photoPositionForRequirement) ?? [];
  const definitionsValid =
    mandatoryNames !== null &&
    loadMandatoryNames !== null &&
    !requiredPositions.includes(null) &&
    !loadRequiredPositions.includes(null);
  const currentRequirements = requiredPositions.filter((position) => position !== null);
  const requirements =
    phase === PHOTO_PHASE.delivery
      ? deliveryPhotoRequirements(currentRequirements, loadPositions)
      : currentRequirements;
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
    ...(phaseNumbers !== undefined && phaseNumbers.length > 0
      ? { phaseNumbers: phaseNumbers.join(',') }
      : {}),
  };

  const openMandatoryPhoto = (position: PhotoPosition, photo: OverviewPhoto | null): void => {
    const replacementParams = {
      ...(photo?.status === PHOTO_STATUS.sent
        ? {
            overrideExisting: '1',
            isExtraOverride: photo.isExtra === true ? '1' : '0',
          }
        : {}),
      ...(photo?.source === 'local' && photo.status !== PHOTO_STATUS.sent
        ? { replacePhotoId: photo.id }
        : {}),
    };
    if (standGridIndex(position) !== null) {
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]/photos/camera',
        params: {
          ...routeParams,
          mode: 'mandatory',
          category: position.category,
          position: photoPositionToRouteParam(position),
          help: '1',
          ...replacementParams,
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
      params: {
        ...routeParams,
        mode: 'mandatory',
        category: position.category,
        ...replacementParams,
      },
    });
  };

  const openExtraPhotoPosition = (): void => {
    router.push({
      pathname: '/allocations/[id]/services/[serviceId]/photos/position',
      params: routeParams,
    });
  };

  const replacementDraft = phasePhotos.find(
    (photo) => photo.status === PHOTO_STATUS.draft && photo.overrideExisting === true,
  );
  const primaryButtonLabel = replacementDraft
    ? t('photos.sendReplacement')
    : missingRequired > 0
      ? t('photos.remainingMandatory', { count: missingRequired })
      : t('photos.send');
  const submitPhotos = async (): Promise<void> => {
    if (replacementDraft) {
      await submitOverride(replacementDraft.id);
    } else {
      await submitBatch(phase);
    }
    router.back();
  };

  return (
    <Screen
      footer={
        <>
          {lookupFailed || loadFailed ? (
            <Text style={styles.counterText}>{t('common.somethingWrong')}</Text>
          ) : null}
          <Button
            label={primaryButtonLabel}
            onPress={() => void submitPhotos()}
            disabled={!canLeave || busy}
          />
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
        <Toolbar>
          {VEHICLE_TYPES.map(({ key, label, Icon }) => {
            const selected = vehicleType === key;
            const iconColor = selected ? colors.brandText : colors.brandLight;
            return (
              <ToolbarSlot key={key}>
                <ToolbarButton
                  accessibilityLabel={label}
                  selected={selected}
                  onPress={() => setVehicleType(key)}
                >
                  {Icon ? (
                    <Icon size={22} color={iconColor} />
                  ) : (
                    <Text style={[styles.otherPillText, { color: iconColor }]}>?</Text>
                  )}
                </ToolbarButton>
              </ToolbarSlot>
            );
          })}
        </Toolbar>
        {phase === PHOTO_PHASE.delivery &&
        (loadPhotos.length > 0 || serverLoadPhotos.length > 0) ? (
          <>
            <CollapsibleSectionHeader
              title={`${t('photos.loadReference')}`}
              count={loadPhotos.length || serverLoadPhotos.length}
              collapsed={collapsedSections.has('load')}
              onPress={() => toggleSection('load')}
            />
            {!collapsedSections.has('load') ? (
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
                        previewable
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
                        previewable
                        photo={{
                          id: `load-server-${index}`,
                          position: photo.position,
                          status: PHOTO_STATUS.sent,
                          uri: photo.url,
                        }}
                      />
                    ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}
        <CollapsibleSectionHeader
          title={`${t('photos.mandatory')}`}
          count={t('photos.mandatoryCount', {
            count: mandatoryPhotos.filter((entry) => entry.photo !== null).length,
            total: mandatoryPhotos.length,
          })}
          collapsed={collapsedSections.has('mandatory')}
          onPress={() => toggleSection('mandatory')}
        />
        {!collapsedSections.has('mandatory') ? (
          <View style={styles.gridTwo}>
            {mandatoryPhotos.map(({ position, photo }, index) => (
              <MandatoryPhotoTile
                key={`${photoTypeKey(position)}-${index}`}
                position={position}
                photo={photo}
                onPress={() => openMandatoryPhoto(position, photo)}
              />
            ))}
          </View>
        ) : null}
        <CollapsibleSectionHeader
          title={`${t('photos.extra')}`}
          count={`${extraPhotos.length}`}
          collapsed={collapsedSections.has('extra')}
          onPress={() => toggleSection('extra')}
        />
        {!collapsedSections.has('extra') ? (
          <View style={styles.gridThree}>
            {extraPhotos.map((photo) => (
              <ExtraPhotoTile
                key={photo.id}
                photo={photo}
                locked={photo.status === PHOTO_STATUS.sent}
              />
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
        ) : null}
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
        </>
      )}
      <TileFooter label={positionName(position)} />
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
  locked = false,
  previewable = false,
}: {
  photo: OverviewPhoto;
  variant?: 'grid' | 'strip';
  locked?: boolean;
  previewable?: boolean;
}) {
  const { t } = useTranslation();
  const [previewVisible, setPreviewVisible] = useState(false);
  const strip = variant === 'strip';
  return (
    <>
      <Pressable
        accessibilityRole={previewable ? 'button' : undefined}
        accessibilityLabel={previewable ? t('photos.viewPhoto') : undefined}
        disabled={!previewable}
        onPress={() => setPreviewVisible(true)}
        style={[styles.extraTile, strip && styles.stripTile]}
      >
        <Image
          source={{ uri: photo.uri }}
          style={[styles.extraImage, strip && styles.stripImage]}
          resizeMode="cover"
        />
        {locked ? (
          <View style={styles.lockBadge} accessibilityLabel={t('photos.locked')}>
            <Ionicons name="lock-closed" size={14} color="#fff" />
          </View>
        ) : null}
        <View
          style={[styles.extraFooter, styles.extraFooterPositioned, strip && styles.stripFooter]}
        >
          <Text style={[styles.extraFooterText, strip && styles.stripFooterText]} numberOfLines={1}>
            {positionName(photo.position)}
          </Text>
        </View>
      </Pressable>
      <Modal
        animationType="fade"
        transparent
        visible={previewVisible}
        onRequestClose={() => setPreviewVisible(false)}
      >
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewVisible(false)}>
          <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.previewClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function positionName(position: PhotoPosition): string {
  if (position.category === 'EXTERIOR') return position.angle;
  if (position.category === 'TYRES') return position.tyre;
  return PHOTO_CATEGORY_LABEL[position.category];
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F8' },
  content: { gap: 0 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  otherPillText: { fontSize: 18, fontWeight: '700' },
  counterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  gridTwo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  requiredTile: {
    width: '48.5%',
    height: 118,
    borderRadius: 14,
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
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  requiredTileLabel: { color: colors.text, fontSize: 9.5, fontWeight: '700' },
  requiredDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  tileImage: { width: '100%', height: '100%', backgroundColor: colors.border },
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
    // Fixed width: % in a horizontal ScrollView breaks content-size and clips the end.
    width: 168,
    height: 112,
    flexShrink: 0,
  },
  extraImage: { width: '100%', height: 70, backgroundColor: '#E7E8EA' },
  stripImage: { height: 82, backgroundColor: '#222428' },
  lockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  previewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
  },
  previewImage: { width: '100%', height: '82%' },
  previewClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
