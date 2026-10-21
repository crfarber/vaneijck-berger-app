import type { Coordinate } from '@/domeinen/location';

/** Messages the Leaflet WebView posts to React Native. */
export const OSM_MAP_INBOUND = {
  READY: 'ready',
  MARKER_PRESS: 'markerPress',
  MAP_PRESS: 'mapPress',
  CAMERA_MOVE: 'cameraMove',
} as const;

export type OsmMapInboundMessage =
  | { readonly type: typeof OSM_MAP_INBOUND.READY }
  | { readonly type: typeof OSM_MAP_INBOUND.MARKER_PRESS; readonly allocationId: string }
  | { readonly type: typeof OSM_MAP_INBOUND.MAP_PRESS; readonly coordinate: Coordinate }
  | { readonly type: typeof OSM_MAP_INBOUND.CAMERA_MOVE; readonly latitudeDelta: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses a WebView `postMessage` payload from the Android OSM map.
 * Invalid JSON or unknown shapes return null so the UI can ignore noise.
 */
export function parseOsmMapInboundMessage(raw: string): OsmMapInboundMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return null;
  }
  switch (parsed.type) {
    case OSM_MAP_INBOUND.READY:
      return { type: OSM_MAP_INBOUND.READY };
    case OSM_MAP_INBOUND.MARKER_PRESS: {
      const allocationId = parsed.allocationId;
      if (typeof allocationId !== 'string' || allocationId === '') {
        return null;
      }
      return { type: OSM_MAP_INBOUND.MARKER_PRESS, allocationId };
    }
    case OSM_MAP_INBOUND.MAP_PRESS: {
      const latitude = parsed.latitude;
      const longitude = parsed.longitude;
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return null;
      }
      return {
        type: OSM_MAP_INBOUND.MAP_PRESS,
        coordinate: { latitude, longitude },
      };
    }
    case OSM_MAP_INBOUND.CAMERA_MOVE: {
      const latitudeDelta = parsed.latitudeDelta;
      if (typeof latitudeDelta !== 'number' || !Number.isFinite(latitudeDelta)) {
        return null;
      }
      return { type: OSM_MAP_INBOUND.CAMERA_MOVE, latitudeDelta };
    }
    default:
      return null;
  }
}
