import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  cameraForPoints,
  isSelfMapTap,
  LOCATION_ACCURACY,
  resolveCurrentPosition,
  type Coordinate,
  type MapCameraPosition,
} from '@/domeinen/location';
import { GpsStatusSheet, useGpsStatus, useLocationReader } from '@/domeinen/location/ui';
import { PERMISSION_KIND, PERMISSION_STATUS } from '@/domeinen/settings';
import { useDevicePermissions } from '@/domeinen/settings/ui';
import { useScheduler } from '@/shared/ui/scheduler-context';
import { colors, radius, spacing, type } from '@/shared/ui/theme';
import { AllocationsMapView, type AllocationsMapHandle } from '../components/allocations-map-view';
import { MapAcceptRunner } from '../components/map-accept-runner';
import { MapAllocationSheet } from '../components/map-allocation-sheet';
import { MapCenterButton } from '../components/map-center-button';
import { MapGpsBanner } from '../components/map-gps-banner';
import { cameraForFocusedAllocation, toAllocationMapMarkers } from '../domain/map-markers';
import { hasActiveAllocations } from '../domain/sections';
import { classifyAllocation, type AllocationListBucket } from '../domain/status';
import type { Allocation } from '../domain/types';
import { useAllocations } from '../hooks/use-allocations';

/** How often the map banner refreshes the live fix while the screen is focused. */
const GPS_BANNER_REFRESH_MS = 5_000;

/**
 * Full-screen overview of the berger's assignments on a map, plus their live device position
 * (Apple Maps blue dot on iOS; OSM circle marker on Android). Marker taps open a bottom sheet
 * with the incident summary; when no assignment is selected a GPS banner shows the live fix
 * (replacing the toolbar GPS button). With `focusAllocationId` the map opens zoomed in on that
 * assignment's pin instead of framing all pins.
 */
export function AllocationsMapScreen({ focusAllocationId }: { focusAllocationId?: string } = {}) {
  const { t } = useTranslation();
  const reader = useLocationReader();
  const permissions = useDevicePermissions();
  const scheduler = useScheduler();
  const gps = useGpsStatus();
  const mapRef = useRef<AllocationsMapHandle | null>(null);
  const { data: allocations, isPending, isError, sections } = useAllocations();
  /** Same order as the list: active (newest first), then pending (by name). */
  const orderedAllocations = useMemo(() => {
    const [active, pending] = sections;
    return [...active.data, ...pending.data];
  }, [sections]);
  const markers = useMemo(() => toAllocationMapMarkers(orderedAllocations), [orderedAllocations]);
  const markersRef = useRef(markers);
  const allocationsRef = useRef(allocations);
  const latitudeDeltaRef = useRef<number | undefined>(undefined);
  /** Permission banner only — a missing GPS fix is not the same as a refused permission. */
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(true);
  /** Frozen after first ready frame so React does not fight pinch-zoom via cameraPosition. */
  const [initialCameraPosition, setInitialCameraPosition] = useState<MapCameraPosition | null>(
    null,
  );
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<AllocationListBucket | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<Allocation | null>(null);
  const [gpsSheetVisible, setGpsSheetVisible] = useState(false);
  const [centering, setCentering] = useState(false);
  const activeWork = hasActiveAllocations(sections);
  const assignmentSheetOpen =
    selectedAllocation !== null && selectedBucket !== null && selectedBucket !== 'hidden';
  const showGpsBanner = !assignmentSheetOpen && !gpsSheetVisible;

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    allocationsRef.current = allocations;
  }, [allocations]);

  const markersCamera = useMemo(() => {
    const focused = cameraForFocusedAllocation(markers, focusAllocationId);
    if (focused !== null) {
      return focused;
    }
    const points = markers.map((marker) => marker.coordinate);
    // No assignments: open on the live GPS if we already have a fix, otherwise Netherlands.
    if (points.length === 0 && gps.coordinate !== null) {
      return cameraForPoints([gps.coordinate]);
    }
    return cameraForPoints(points);
  }, [markers, focusAllocationId, gps.coordinate]);

  if (!isPending && initialCameraPosition === null) {
    setInitialCameraPosition(markersCamera);
  }

  // After mount: permission banner + optional GPS frame when there are no markers.
  // Do not reframe markers+GPS together — a distant/wrong pin pulls the camera to sea.
  // The center button re-centres on the berger on demand.
  useEffect(() => {
    if (isPending || initialCameraPosition === null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const permission = await permissions.read(PERMISSION_KIND.location);
      if (cancelled) {
        return;
      }
      const granted = permission.status === PERMISSION_STATUS.granted;
      setLocationPermissionGranted(granted);
      if (!granted) {
        return;
      }
      if (markersRef.current.length > 0) {
        return;
      }
      const current = await reader.getCurrent({ accuracy: LOCATION_ACCURACY.coarse });
      if (cancelled) {
        return;
      }
      const userCoordinate = resolveCurrentPosition(current);
      if (userCoordinate === null) {
        return;
      }
      mapRef.current?.setCameraPosition(cameraForPoints([userCoordinate]));
    })();
    return () => {
      cancelled = true;
    };
  }, [isPending, initialCameraPosition, reader, permissions]);

  // Keep the GPS banner fresh while this screen is focused (Scheduler, not setInterval).
  const refreshGps = gps.refresh;
  useEffect(() => {
    let cancelled = false;
    let cancel = (): void => {};
    const tick = (): void => {
      if (cancelled) {
        return;
      }
      void refreshGps();
      cancel = scheduler.schedule(tick, GPS_BANNER_REFRESH_MS);
    };
    cancel = scheduler.schedule(tick, GPS_BANNER_REFRESH_MS);
    return () => {
      cancelled = true;
      cancel();
    };
  }, [refreshGps, scheduler]);

  const closeAssignmentSheet = useCallback((): void => {
    setSelectedAllocation(null);
    setSelectedBucket(null);
  }, []);

  const openGpsSheet = useCallback((): void => {
    closeAssignmentSheet();
    setGpsSheetVisible(true);
    void gps.refresh({ showBusy: true });
  }, [closeAssignmentSheet, gps]);

  const closeGpsSheet = useCallback((): void => {
    setGpsSheetVisible(false);
  }, []);

  const openPreview = useCallback((allocationId: string): void => {
    router.push({
      pathname: '/allocations/[id]',
      params: { id: allocationId, mode: 'readonly' },
    });
  }, []);

  const openActive = useCallback((allocationId: string): void => {
    router.push({
      pathname: '/allocations/[id]',
      params: { id: allocationId },
    });
  }, []);

  const onMarkerPress = useCallback((allocationId: string): void => {
    const allocation = allocationsRef.current?.find(
      (entry) => entry.dn_allocationid === allocationId,
    );
    if (allocation === undefined) {
      return;
    }
    const bucket = classifyAllocation(allocation);
    if (bucket === 'hidden') {
      return;
    }
    setGpsSheetVisible(false);
    setSelectedAllocation(allocation);
    setSelectedBucket(bucket);
  }, []);

  const onMapPress = useCallback(
    (coordinate: Coordinate): void => {
      const self = gps.coordinate;
      if (self === null) {
        return;
      }
      if (!isSelfMapTap(coordinate, self, latitudeDeltaRef.current)) {
        return;
      }
      openGpsSheet();
    },
    [gps.coordinate, openGpsSheet],
  );

  const onCameraMove = useCallback((latitudeDelta: number): void => {
    latitudeDeltaRef.current = latitudeDelta;
  }, []);

  const centerOnSelf = useCallback(async (): Promise<void> => {
    setCentering(true);
    try {
      const permission = await permissions.read(PERMISSION_KIND.location);
      if (permission.status !== PERMISSION_STATUS.granted) {
        setLocationPermissionGranted(false);
        return;
      }
      setLocationPermissionGranted(true);
      const current = await reader.getCurrent({ accuracy: LOCATION_ACCURACY.coarse });
      const userCoordinate = resolveCurrentPosition(current);
      if (userCoordinate === null) {
        return;
      }
      mapRef.current?.setCameraPosition(cameraForPoints([userCoordinate]));
      void gps.refresh();
    } finally {
      setCentering(false);
    }
  }, [permissions, reader, gps]);

  if (isPending || initialCameraPosition === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{t('allocations.loadFailed')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AllocationsMapView
        ref={mapRef}
        initialCameraPosition={initialCameraPosition}
        markers={markers}
        userCoordinate={gps.coordinate}
        onMarkerPress={onMarkerPress}
        onMapPress={onMapPress}
        onCameraMove={onCameraMove}
      />
      <MapAllocationSheet
        allocation={selectedAllocation}
        bucket={selectedBucket}
        onClose={closeAssignmentSheet}
        onPreview={openPreview}
        onAccept={setAcceptTarget}
        onOpen={openActive}
      />
      <GpsStatusSheet visible={gpsSheetVisible} onClose={closeGpsSheet} gps={gps} />
      <MapCenterButton
        visible={showGpsBanner && locationPermissionGranted}
        busy={centering}
        onPress={() => void centerOnSelf()}
      />
      <MapGpsBanner gps={gps} visible={showGpsBanner} onPress={openGpsSheet} />
      {acceptTarget !== null ? (
        <MapAcceptRunner
          key={acceptTarget.dn_allocationid}
          allocation={acceptTarget}
          hasActiveAllocations={activeWork}
          onDone={() => setAcceptTarget(null)}
        />
      ) : null}
      <View style={styles.banners} pointerEvents="box-none">
        {!locationPermissionGranted ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{t('allocations.map.locationUnavailable')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('allocations.map.openPermissions')}
              onPress={() => router.push('/permissions')}
              hitSlop={spacing.sm}
            >
              <Text style={styles.bannerLink}>{t('allocations.map.openPermissions')}</Text>
            </Pressable>
          </View>
        ) : null}
        {markers.length === 0 ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{t('allocations.map.noMarkers')}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: { ...type.body, color: colors.text, textAlign: 'center' },
  banners: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  banner: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  bannerText: { ...type.small, color: colors.text },
  bannerLink: { ...type.label, color: colors.brandAction },
});
