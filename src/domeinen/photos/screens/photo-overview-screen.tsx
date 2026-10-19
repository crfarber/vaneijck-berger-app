import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { Button } from '@/shared/ui/button';
import { CollapsibleSectionHeader } from '@/shared/ui/collapsible-section-header';
import { CameraSVG } from '@/shared/ui/icons/camera';
import CheckIcon from '@/shared/ui/icons/check';
import { ChevronLeftSVG } from '@/shared/ui/icons/chevron-left';
import { CarSVG, MotorcycleSVG, TruckSVG } from '@/shared/ui/icons/vehicles';
import { Toolbar, ToolbarSlot } from '@/shared/ui/toolbar';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { colors, spacing } from '@/shared/ui/theme';
import {
  PHOTO_CATEGORY_LABEL,
  PHOTO_PHASE,
  PHOTO_STATUS,
  deliveryPhotoRequirements,
  isExtraForUpload,
  localsForOverview,
  matchLocalCopies,
  pendingOverrideTypeKeys,
  pickMandatoryAndExtra,
  photoPositionForRequirement,
  photoPositionToRouteParam,
  photoPhaseFromServiceStatus,
  photoTypeKey,
  standGridIndex,
  type PhotoPosition,
  type PhotoRole,
  type PhotoStatus,
  type ServerPhotoSummary,
} from '../index';
import { useServicePhotos } from '../hooks/use-service-photos';
import { PhotoZoomViewer } from '../components/photo-zoom-viewer';
import { useServerPhotoUris } from '../hooks/use-server-photo-uris';
import { usePhotoService } from '../hooks/photos-context';
import type { PhotoFlowContext } from './photo-flow';
import { goBackOrReplace } from '@/shared/ui/navigation';
import { Screen } from '@/shared/ui/screen';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import type { StatusOutcome } from '@/shared/feedback/status-overlay';

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
  overrideExisting?: boolean;
  imageState?: 'loading' | 'failed';
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
  const statusOverlay = useStatusOverlay();
  const phase = photoPhaseFromServiceStatus(serviceStatuscode, phaseNumbers);
  const photoService = usePhotoService();
  const { photos, loaded, loadFailed, submitBatch, submitOverride, retry, remove, busy } =
    useServicePhotos(serviceId);
  const [vehicleType, setVehicleType] = useState<VehicleType>('AUTO');
  const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<PhotoSectionKey>>(
    () => new Set(),
  );
  const [serverPhotos, setServerPhotos] = useState<ServerPhotoSummary[]>([]);
  const [serverLoadPhotos, setServerLoadPhotos] = useState<ServerPhotoSummary[]>([]);
  const [lookupFailed, setLookupFailed] = useState(false);
  const phasePhotos = photos.filter((photo) => photo.phase === phase);
  const loadPhotos = photos.filter((photo) => photo.phase === PHOTO_PHASE.load);
  const mandatoryKey = mandatoryNames?.join('\n') ?? null;
  const loadMandatoryKey = loadMandatoryNames?.join('\n') ?? null;

  const toggleSection = (key: PhotoSectionKey): void => {
    setCollapsedSections((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!loaded || !incidentId || mandatoryKey === null || loadMandatoryKey === null) return;
    let active = true;
    const fetchMissing = async (): Promise<void> => {
      try {
        const positions = (key: string): PhotoPosition[] =>
          (key === '' ? [] : key.split('\n'))
            .map(photoPositionForRequirement)
            .filter((position) => position !== null);
        const load =
          phase === PHOTO_PHASE.delivery
            ? await photoService.listServerPhotos(
                {
                  allocationId,
                  incidentId,
                  serviceId,
                  phase: PHOTO_PHASE.load,
                },
                positions(loadMandatoryKey),
              )
            : [];
        const localLoadPhotos = photos.filter(
          (photo) => photo.phase === PHOTO_PHASE.load && photo.status !== PHOTO_STATUS.failed,
        );
        const loadCopies = matchLocalCopies(load, localLoadPhotos);
        const copiedLoadIds = new Set(loadCopies.map((photo) => photo?.id));
        const loadPositions = [
          ...load.map((photo) => photo.position),
          ...localLoadPhotos
            .filter((photo) => !copiedLoadIds.has(photo.id))
            .map((photo) => photo.position),
        ];
        const required = positions(mandatoryKey);
        const current = await photoService.listServerPhotos(
          { allocationId, incidentId, serviceId, phase },
          phase === PHOTO_PHASE.delivery
            ? deliveryPhotoRequirements(required, loadPositions)
            : required,
        );
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
    photos,
    mandatoryKey,
    loadMandatoryKey,
  ]);

  const overrideTypes = pendingOverrideTypeKeys(phasePhotos);
  const serverPositions = serverPhotos.map((photo) => photo.position);
  // While overrides exist, show only the latest replacement per mandatory type — not earlier
  // local sent mandatory siblings. Additional photos of the same type stay under Extra.
  const localCurrentPhotos: OverviewPhoto[] = localsForOverview(phasePhotos).map((photo) => ({
    id: photo.id,
    position: photo.position,
    status: photo.status,
    uri: photo.displayUri,
    role: photo.role,
    source: 'local' as const,
    isExtra:
      photo.overrideExisting === true
        ? false
        : (photo.isExtraOverride ?? isExtraForUpload(photo, phasePhotos, serverPositions)),
    overrideExisting: photo.overrideExisting === true,
  }));
  // Hide only the non-extra server copy of an overridden type; server extras stay under Extra.
  const visibleServerPhotos = serverPhotos.filter(
    (photo) => !overrideTypes.has(photoTypeKey(photo.position)) || photo.isExtra === true,
  );
  const localCopies = matchLocalCopies(visibleServerPhotos, localCurrentPhotos);
  const copiedLocalIds = new Set(localCopies.map((photo) => photo?.id));
  const loadCopies = matchLocalCopies(serverLoadPhotos, loadPhotos);
  const remoteLoadPhotos = serverLoadPhotos.filter((_, index) => loadCopies[index] === null);
  const remoteUris = useServerPhotoUris(allocationId, [
    ...visibleServerPhotos
      .filter((_, index) => localCopies[index] === null)
      .map((photo) => photo.url),
    ...remoteLoadPhotos.map((photo) => photo.url),
  ]);
  const remoteImage = (url: string): Pick<OverviewPhoto, 'uri' | 'imageState'> => {
    const uri = remoteUris[url];
    if (uri === undefined) return { uri: '', imageState: 'loading' };
    if (uri === null) return { uri: '', imageState: 'failed' };
    return { uri };
  };
  const serverCurrentPhotos: OverviewPhoto[] = visibleServerPhotos.map((photo, index) => {
    const copy = localCopies[index];
    return {
      id: `server-${index}`,
      position: photo.position,
      status: PHOTO_STATUS.sent,
      ...(copy ? { uri: copy.uri } : remoteImage(photo.url)),
      source: 'server',
      isExtra: photo.isExtra,
    };
  });
  const includeLocalPhoto = (photo: OverviewPhoto): boolean => !copiedLocalIds.has(photo.id);
  const currentPhotos: OverviewPhoto[] = [
    ...localCurrentPhotos.filter(
      (photo) => photo.role !== 'additional' && includeLocalPhoto(photo),
    ),
    ...serverCurrentPhotos,
    ...localCurrentPhotos.filter(
      (photo) => photo.role === 'additional' && includeLocalPhoto(photo),
    ),
  ];
  const loadPositions = [
    ...loadPhotos
      .filter((photo) => photo.status !== PHOTO_STATUS.failed)
      .map((photo) => photo.position),
    ...remoteLoadPhotos.map((photo) => photo.position),
  ];
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
  const assigned = pickMandatoryAndExtra(requirements, usablePhotos);
  const mandatoryPhotos = requirements.map((position, index) => ({
    position,
    photo: assigned.mandatory[index] ?? null,
  }));
  const extraPhotos = assigned.extra;
  // Count empty mandatory tiles, not "any photo of that type" — an extra of the same type
  // must not satisfy a required slot.
  const missingRequired = mandatoryPhotos.filter((entry) => entry.photo === null).length;
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
    const asServerOverride = photo?.status === PHOTO_STATUS.sent;
    const asOverrideDraft = photo?.overrideExisting === true;
    const replacementParams = {
      ...(asServerOverride || asOverrideDraft
        ? {
            overrideExisting: '1',
            // Mandatory override is never an extra upload.
            isExtraOverride: '0',
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
          // Stand-position help only on the first take, not when replacing.
          ...(photo === null ? { help: '1' } : {}),
          ...replacementParams,
        },
      });
      return;
    }
    if (position.category === 'EXTERIOR' || position.category === 'TYRES') {
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]/photos/camera',
        params: {
          ...routeParams,
          mode: 'mandatory',
          position: photoPositionToRouteParam(position),
          ...replacementParams,
        },
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

  const openExtraPhotoRetake = (photo: OverviewPhoto): void => {
    if (photo.source !== 'local' || photo.status === PHOTO_STATUS.sent) {
      return;
    }
    router.push({
      pathname: '/allocations/[id]/services/[serviceId]/photos/camera',
      params: {
        ...routeParams,
        mode: 'extra',
        position: photoPositionToRouteParam(photo.position),
        replacePhotoId: photo.id,
      },
    });
  };

  const replacementDrafts = phasePhotos.filter(
    (photo) => photo.status === PHOTO_STATUS.draft && photo.overrideExisting === true,
  );
  const regularDrafts = phasePhotos.filter(
    (photo) => photo.status === PHOTO_STATUS.draft && photo.overrideExisting !== true,
  );
  const primaryButtonLabel =
    replacementDrafts.length > 0
      ? t('photos.sendReplacement')
      : missingRequired > 0
        ? t('photos.remainingMandatory', { count: missingRequired })
        : t('photos.send');
  // The overview is the root of the photo stack, so going back leaves the whole stack and lands
  // on the form underneath. Only without a form below (deep link) does it replace to the form.
  const leaveToServiceForm = (): void => {
    goBackOrReplace(router, {
      pathname: '/allocations/[id]/services/[serviceId]/form',
      params: {
        id: allocationId,
        serviceId,
      },
    });
  };
  const submitPhotos = async (): Promise<void> => {
    let succeeded = false;
    await statusOverlay.run(t('photos.attachingLocation'), async () => {
      for (const draft of replacementDrafts) {
        const ready = await photoService.attachLocation({
          serviceId,
          phase,
          photoId: draft.id,
        });
        if (!ready) {
          return {
            tone: 'error',
            message: t('photos.locationMissing'),
            retry: () => {
              void submitPhotos();
            },
          } satisfies StatusOutcome;
        }
      }
      if (regularDrafts.length > 0 || replacementDrafts.length === 0) {
        const ready = await photoService.attachLocation({ serviceId, phase });
        if (!ready) {
          return {
            tone: 'error',
            message: t('photos.locationMissing'),
            retry: () => {
              void submitPhotos();
            },
          } satisfies StatusOutcome;
        }
      }
      statusOverlay.store.setState({
        current: {
          phase: 'processing',
          message: t('feedback.processing.sendPhotos'),
          slow: false,
        },
      });
      for (const draft of replacementDrafts) {
        await submitOverride(draft.id);
      }
      if (regularDrafts.length > 0 || replacementDrafts.length === 0) {
        await submitBatch(phase);
      }
      const after = await photoService.listByService(serviceId);
      const stillQueued = after.some(
        (photo) => photo.phase === phase && photo.status === PHOTO_STATUS.queued,
      );
      if (stillQueued) {
        return { tone: 'queued', message: t('photos.sendQueued') } satisfies StatusOutcome;
      }
      succeeded = true;
      return { tone: 'success', message: t('photos.sendSuccess') } satisfies StatusOutcome;
    });
    if (succeeded) {
      leaveToServiceForm();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={8}
              onPress={leaveToServiceForm}
              style={{ paddingHorizontal: 4 }}
            >
              <ChevronLeftSVG color={colors.brandText} />
            </Pressable>
          ),
        }}
      />
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
                count={loadPhotos.length + remoteLoadPhotos.length}
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
                  {loadPhotos.map((photo) => (
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
                  ))}
                  {remoteLoadPhotos.map((photo, index) => (
                    <ExtraPhotoTile
                      key={`load-server-${index}`}
                      variant="strip"
                      photo={{
                        id: `load-server-${index}`,
                        position: photo.position,
                        status: PHOTO_STATUS.sent,
                        ...remoteImage(photo.url),
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
                  vehicleType={vehicleType}
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
            <View style={styles.gridTwo}>
              {extraPhotos.map((photo) => {
                const locked =
                  photo.source === 'server' ||
                  photo.status === PHOTO_STATUS.sent ||
                  photo.status === PHOTO_STATUS.queued;
                return (
                  <ExtraPhotoTile
                    key={photo.id}
                    photo={photo}
                    locked={locked}
                    statusBadge={
                      photo.status === PHOTO_STATUS.queued
                        ? 'queued'
                        : photo.source === 'server' || photo.status === PHOTO_STATUS.sent
                          ? 'uploaded'
                          : null
                    }
                    onRetake={locked ? undefined : () => openExtraPhotoRetake(photo)}
                    onDelete={
                      locked
                        ? undefined
                        : () => {
                            void remove(photo.id);
                          }
                    }
                  />
                );
              })}
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
            {photos.some(
              (photo) => photo.status === PHOTO_STATUS.failed && photo.phase === phase,
            ) ? (
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
    </>
  );
}

function MandatoryPhotoTile({
  position,
  photo,
  vehicleType,
  onPress,
}: {
  position: PhotoPosition;
  photo: OverviewPhoto | null;
  vehicleType: VehicleType;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const [zoomOpen, setZoomOpen] = useState(false);
  const state =
    photo === null || photo.status === PHOTO_STATUS.failed
      ? 'todo'
      : photo.status === PHOTO_STATUS.sent
        ? 'uploaded'
        : photo.status === PHOTO_STATUS.queued
          ? 'queued'
          : 'done';
  const highlightedIndex = standGridIndex(position);
  const VehicleIcon = VEHICLE_TYPES.find((entry) => entry.key === vehicleType)?.Icon ?? CarSVG;
  const zoomable = state !== 'todo' && photo !== null && canZoom(photo);
  // Queued photos must finish uploading before retake — otherwise a duplicate lands under Extra.
  const canRetake = state === 'done' || state === 'uploaded';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={zoomable ? t('photos.viewPhoto') : undefined}
      onPress={zoomable ? () => setZoomOpen(true) : onPress}
      style={[styles.requiredTile, state === 'done' && styles.requiredTileDone]}
    >
      {state === 'todo' ? (
        <>
          <View style={styles.requiredGrid}>
            {Array.from({ length: 9 }).map((_, index) => {
              const vehicle = index === 4;
              const active = highlightedIndex === index;
              return (
                <View
                  key={index}
                  style={[
                    styles.requiredGridCell,
                    vehicle ? styles.requiredGridCellCenter : null,
                    active ? styles.requiredGridCellActive : null,
                  ]}
                >
                  {vehicle ? (
                    <VehicleIcon size={14} color={active ? colors.text : colors.brandDark} />
                  ) : null}
                </View>
              );
            })}
          </View>
          <TileFooter label={positionName(position).toUpperCase()} />
        </>
      ) : (
        <>
          {photo ? <PhotoImage photo={photo} style={styles.tileImage} resizeMode="cover" /> : null}
          <View style={styles.tileTopBadgeRow} pointerEvents="box-none">
            {state === 'uploaded' ? (
              <View style={styles.uploadBadge}>
                <Text style={styles.uploadBadgeText}>{t('photos.uploaded')}</Text>
              </View>
            ) : state === 'queued' ? (
              <View style={styles.uploadBadge}>
                <Text style={styles.uploadBadgeText}>{t('photos.queuedBadge')}</Text>
              </View>
            ) : (
              <View style={styles.checkBadge}>
                <CheckIcon size={14} color={colors.background} />
              </View>
            )}
            {canRetake ? <RetakeButton onPress={onPress} /> : <View />}
          </View>
        </>
      )}
      <TileFooter label={positionName(position).toUpperCase()} />
      {zoomOpen && photo ? (
        <PhotoZoomViewer uri={photo.uri} onClose={() => setZoomOpen(false)} />
      ) : null}
    </Pressable>
  );
}

function canZoom(photo: OverviewPhoto): boolean {
  return photo.imageState === undefined && photo.uri !== '';
}

function RetakeButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('photos.retake')}
      hitSlop={12}
      onPress={onPress}
      style={styles.retakeBadge}
    >
      <Text style={styles.retakeBadgeText}>{t('photos.retake')}</Text>
    </Pressable>
  );
}

function TileFooter({ label }: { label: string }) {
  return (
    <View style={styles.requiredTileFooter}>
      <Text style={styles.requiredTileLabel}>{label}</Text>
    </View>
  );
}

function ExtraPhotoTile({
  photo,
  variant = 'grid',
  locked = false,
  statusBadge = null,
  onRetake,
  onDelete,
}: {
  photo: OverviewPhoto;
  variant?: 'grid' | 'strip';
  locked?: boolean;
  statusBadge?: 'queued' | 'uploaded' | null;
  onRetake?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const [zoomOpen, setZoomOpen] = useState(false);
  const strip = variant === 'strip';
  const editable = !locked && !strip && onRetake !== undefined && onDelete !== undefined;
  const zoomable = canZoom(photo);
  const TileShell = zoomable || editable ? Pressable : View;
  const label = extraTileLabel(photo, t('photos.extraSuffix'));
  return (
    <>
      <TileShell
        {...(zoomable || editable
          ? {
              accessibilityRole: 'button' as const,
              accessibilityLabel: zoomable ? t('photos.viewPhoto') : t('photos.retake'),
              onPress: () => {
                if (zoomable) {
                  setZoomOpen(true);
                  return;
                }
                onRetake?.();
              },
            }
          : {})}
        style={[styles.extraTile, strip && styles.stripTile]}
      >
        <PhotoImage
          photo={photo}
          style={[styles.extraImage, strip && styles.stripImage]}
          resizeMode="cover"
        />
        {locked ? (
          <View style={styles.tileTopBadgeRow} pointerEvents="none">
            {statusBadge !== null ? (
              <View style={styles.uploadBadge}>
                <Text style={styles.uploadBadgeText}>
                  {statusBadge === 'queued' ? t('photos.queuedBadge') : t('photos.uploaded')}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.lockBadgeInline} accessibilityLabel={t('photos.locked')}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
            </View>
          </View>
        ) : null}
        {editable ? (
          <View style={styles.tileTopBadgeRow} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('photos.delete')}
              hitSlop={8}
              onPress={onDelete}
              style={styles.deleteBadge}
            >
              <Ionicons name="trash-outline" size={14} color={colors.background} />
            </Pressable>
            <RetakeButton onPress={onRetake} />
          </View>
        ) : null}
        <View
          style={strip ? styles.stripFooter : [styles.extraFooter, styles.extraFooterPositioned]}
        >
          <Text style={[styles.extraFooterText, strip && styles.stripFooterText]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </TileShell>
      {zoomOpen ? <PhotoZoomViewer uri={photo.uri} onClose={() => setZoomOpen(false)} /> : null}
    </>
  );
}

function extraTileLabel(photo: OverviewPhoto, extraSuffix: string): string {
  const base = positionName(photo.position).toUpperCase();
  return photo.isExtra === true ? `${base} ${extraSuffix}` : base;
}

function PhotoImage({
  photo,
  style,
  resizeMode,
}: {
  photo: OverviewPhoto;
  style: StyleProp<ImageStyle>;
  resizeMode: 'cover' | 'contain';
}) {
  const { t } = useTranslation();
  if (photo.imageState !== undefined) {
    return (
      <View
        style={[style, styles.imagePlaceholder]}
        accessibilityLabel={
          photo.imageState === 'loading' ? t('photos.imageLoading') : t('photos.imageUnavailable')
        }
      >
        {photo.imageState === 'loading' ? (
          <ActivityIndicator color={colors.textMuted} />
        ) : (
          <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        )}
      </View>
    );
  }
  return <Image source={{ uri: photo.uri }} style={style} resizeMode={resizeMode} />;
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  requiredTileDone: { borderColor: colors.border, backgroundColor: colors.background },
  requiredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginTop: 14,
    gap: 3,
  },
  requiredGridCell: {
    width: 18,
    height: 18,
    backgroundColor: '#F2F3F4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredGridCellCenter: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
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
  deleteBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
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
    width: '48.5%',
    height: 118,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  stripTile: {
    // Fixed width: % in a horizontal ScrollView breaks content-size and clips the end.
    width: 168,
    height: 112,
    flexShrink: 0,
  },
  extraImage: { width: '100%', height: '100%', backgroundColor: '#E7E8EA' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
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
  lockBadgeInline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  extraFooter: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraFooterPending: { backgroundColor: '#FEEB8C' },
  extraFooterPositioned: { backgroundColor: colors.brand },
  stripFooter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#111315',
  },
  extraFooterText: { color: colors.text, fontSize: 9.5, fontWeight: '700' },
  stripFooterText: { color: colors.background },
  addTile: {
    width: '48.5%',
    height: 118,
    borderRadius: 14,
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
