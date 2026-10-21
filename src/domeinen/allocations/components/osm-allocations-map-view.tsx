import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Coordinate, MapCameraPosition } from '@/domeinen/location';
import { colors } from '@/shared/ui/theme';
import { ALLOCATION_MAP_MARKER_KIND, type AllocationMapMarker } from '../domain/map-markers';
import { OSM_MAP_INBOUND, parseOsmMapInboundMessage } from '../domain/osm-map-bridge';
import { buildOsmAllocationsMapHtml } from './osm-allocations-map-html';

export type OsmAllocationsMapHandle = {
  setCameraPosition: (position: MapCameraPosition) => void;
};

type OsmAllocationsMapViewProps = {
  initialCameraPosition: MapCameraPosition;
  markers: readonly AllocationMapMarker[];
  /** Live device position drawn as a circle marker (WebView has no native blue dot). */
  userCoordinate: Coordinate | null;
  onMarkerPress: (allocationId: string) => void;
  onMapPress?: (coordinate: Coordinate) => void;
  onCameraMove?: (latitudeDelta: number) => void;
};

type OutboundCommand =
  | {
      type: 'setCamera';
      coordinates: Coordinate;
      zoom: number;
    }
  | {
      type: 'setMarkers';
      markers: readonly {
        id: string;
        latitude: number;
        longitude: number;
        sequence: number;
        kind: string;
        title: string;
      }[];
    }
  | {
      type: 'setUserLocation';
      coordinate: Coordinate | null;
    };

/**
 * Android allocations overview: OpenStreetMap tiles via Leaflet in a WebView.
 * Same behavioural contract as Apple Maps on iOS (camera ref, markers, map press, camera move).
 */
export const OsmAllocationsMapView = forwardRef<
  OsmAllocationsMapHandle,
  OsmAllocationsMapViewProps
>(function OsmAllocationsMapView(
  { initialCameraPosition, markers, userCoordinate, onMarkerPress, onMapPress, onCameraMove },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<OutboundCommand[]>([]);
  const initialCameraRef = useRef(initialCameraPosition);

  const html = useMemo(
    () =>
      buildOsmAllocationsMapHtml({
        standardFill: colors.brandAction,
        pltrFill: colors.mapPltrPin,
        labelColor: colors.background,
      }),
    [],
  );

  const send = useCallback((command: OutboundCommand): void => {
    if (!readyRef.current) {
      pendingRef.current.push(command);
      return;
    }
    const script = `window.__veReceive(${JSON.stringify(command)}); true;`;
    webRef.current?.injectJavaScript(script);
  }, []);

  const flushPending = useCallback((): void => {
    const queued = pendingRef.current;
    pendingRef.current = [];
    for (const command of queued) {
      const script = `window.__veReceive(${JSON.stringify(command)}); true;`;
      webRef.current?.injectJavaScript(script);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      setCameraPosition: (position: MapCameraPosition): void => {
        send({
          type: 'setCamera',
          coordinates: position.coordinates,
          zoom: position.zoom,
        });
      },
    }),
    [send],
  );

  useEffect(() => {
    send({
      type: 'setMarkers',
      markers: markers.map((marker) => ({
        id: marker.id,
        latitude: marker.coordinate.latitude,
        longitude: marker.coordinate.longitude,
        sequence: marker.sequence,
        kind:
          marker.kind === ALLOCATION_MAP_MARKER_KIND.PLTR
            ? ALLOCATION_MAP_MARKER_KIND.PLTR
            : ALLOCATION_MAP_MARKER_KIND.STANDARD,
        title: marker.title,
      })),
    });
  }, [markers, send]);

  useEffect(() => {
    send({ type: 'setUserLocation', coordinate: userCoordinate });
  }, [userCoordinate, send]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent): void => {
      const message = parseOsmMapInboundMessage(event.nativeEvent.data);
      if (message === null) {
        return;
      }
      switch (message.type) {
        case OSM_MAP_INBOUND.READY: {
          readyRef.current = true;
          send({
            type: 'setCamera',
            coordinates: initialCameraRef.current.coordinates,
            zoom: initialCameraRef.current.zoom,
          });
          flushPending();
          return;
        }
        case OSM_MAP_INBOUND.MARKER_PRESS:
          onMarkerPress(message.allocationId);
          return;
        case OSM_MAP_INBOUND.MAP_PRESS:
          onMapPress?.(message.coordinate);
          return;
        case OSM_MAP_INBOUND.CAMERA_MOVE:
          onCameraMove?.(message.latitudeDelta);
          return;
      }
    },
    [flushPending, onCameraMove, onMapPress, onMarkerPress, send],
  );

  return (
    <WebView
      ref={webRef}
      style={styles.map}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      allowsInlineMediaPlayback
      mixedContentMode="always"
      androidLayerType="hardware"
    />
  );
});

const styles = StyleSheet.create({
  map: { flex: 1 },
});
