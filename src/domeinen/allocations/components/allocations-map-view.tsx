import { AppleMaps } from 'expo-maps';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { Coordinate, MapCameraPosition } from '@/domeinen/location';
import { colors } from '@/shared/ui/theme';
import {
  ALLOCATION_MAP_MARKER_KIND,
  markerSequenceLabel,
  type AllocationMapMarker,
} from '../domain/map-markers';
import { OsmAllocationsMapView, type OsmAllocationsMapHandle } from './osm-allocations-map-view';

export type AllocationsMapHandle = {
  setCameraPosition: (position: MapCameraPosition) => void;
};

type AllocationsMapViewProps = {
  /** Applied once as the map's starting camera; later moves go through the ref. */
  initialCameraPosition: MapCameraPosition;
  markers: readonly AllocationMapMarker[];
  /** Live device position — used on Android OSM (WebView has no native blue dot). */
  userCoordinate?: Coordinate | null;
  onMarkerPress: (allocationId: string) => void;
  /** Map background tap (not a marker). Used to reopen the GPS banner near the blue dot. */
  onMapPress?: (coordinate: Coordinate) => void;
  /** Latest visible latitude span — used for self-tap hit size. */
  onCameraMove?: (latitudeDelta: number) => void;
};

/**
 * Platform map: Apple Maps on iOS, OpenStreetMap (Leaflet WebView) on Android.
 * Sequence numbers are always visible on the pin (iOS annotation `text`, Android DivIcon).
 */
export const AllocationsMapView = forwardRef<AllocationsMapHandle, AllocationsMapViewProps>(
  function AllocationsMapView(
    {
      initialCameraPosition,
      markers,
      userCoordinate = null,
      onMarkerPress,
      onMapPress,
      onCameraMove,
    },
    ref,
  ) {
    const appleRef = useRef<AppleMaps.MapView | null>(null);
    const osmRef = useRef<OsmAllocationsMapHandle | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        setCameraPosition: (position: MapCameraPosition): void => {
          if (Platform.OS === 'ios') {
            appleRef.current?.setCameraPosition(position);
            return;
          }
          osmRef.current?.setCameraPosition(position);
        },
      }),
      [],
    );

    /** iOS: annotation badge with the number always on the map. */
    const appleAnnotations = useMemo(
      () =>
        markers.map((marker) => ({
          id: marker.id,
          coordinates: marker.coordinate,
          title: marker.title,
          text: markerSequenceLabel(marker.sequence),
          textColor: colors.background,
          backgroundColor:
            marker.kind === ALLOCATION_MAP_MARKER_KIND.PLTR
              ? colors.mapPltrPin
              : colors.brandAction,
        })),
      [markers],
    );

    const handleMarkerClick = useCallback(
      (event: { id?: string }): void => {
        const allocationId = event.id;
        if (allocationId === undefined || allocationId === '') {
          return;
        }
        onMarkerPress(allocationId);
      },
      [onMarkerPress],
    );

    const handleMapClick = useCallback(
      (event: { coordinates?: { latitude?: number; longitude?: number } }): void => {
        if (onMapPress === undefined) {
          return;
        }
        const latitude = event.coordinates?.latitude;
        const longitude = event.coordinates?.longitude;
        if (
          latitude === undefined ||
          longitude === undefined ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return;
        }
        onMapPress({ latitude, longitude });
      },
      [onMapPress],
    );

    const handleCameraMove = useCallback(
      (event: { latitudeDelta?: number }): void => {
        if (onCameraMove === undefined) {
          return;
        }
        const delta = event.latitudeDelta;
        if (delta === undefined || !Number.isFinite(delta)) {
          return;
        }
        onCameraMove(delta);
      },
      [onCameraMove],
    );

    if (Platform.OS === 'ios') {
      return (
        <AppleMaps.View
          ref={appleRef}
          style={styles.map}
          cameraPosition={initialCameraPosition}
          annotations={appleAnnotations}
          properties={{ isMyLocationEnabled: true }}
          uiSettings={{
            myLocationButtonEnabled: true,
            compassEnabled: true,
            scaleBarEnabled: true,
          }}
          onAnnotationClick={handleMarkerClick}
          onMapClick={handleMapClick}
          onCameraMove={handleCameraMove}
        />
      );
    }

    return (
      <OsmAllocationsMapView
        ref={osmRef}
        initialCameraPosition={initialCameraPosition}
        markers={markers}
        userCoordinate={userCoordinate}
        onMarkerPress={onMarkerPress}
        onMapPress={onMapPress}
        onCameraMove={onCameraMove}
      />
    );
  },
);

const styles = StyleSheet.create({
  map: { flex: 1 },
});
