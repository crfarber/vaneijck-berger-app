import type { Coordinate } from './geo';

export type MapCameraPosition = {
  readonly coordinates: Coordinate;
  readonly zoom: number;
};

/** Geographic centre of the Netherlands — used when there are no points to frame. */
export const NETHERLANDS_CENTER: Coordinate = {
  latitude: 52.1326,
  longitude: 5.2913,
};

const FALLBACK_ZOOM = 7;
/** One pin only: neighbourhood, not doorstep — room for the blue dot if it appears nearby. */
const SINGLE_POINT_ZOOM = 12;
/** Zooming in on one chosen pin: street level, so the berger sees the exact spot. */
const FOCUS_ZOOM = 16;
const MIN_ZOOM = 5;
const MAX_ZOOM = 14;
/**
 * Extra span so edge pins and the user location stay inside the viewport (header, pin height,
 * portrait aspect). expo-maps uses longitudeDelta = 360 / 2^zoom.
 */
const PADDING_FACTOR = 3;
/**
 * Never frame two+ points tighter than ~11 km (~0.1°) of visible span before padding — otherwise
 * a nearby incident + the berger still crops one of them off screen.
 */
const MIN_SPAN_DEGREES = 0.1;

function zoomForSpanDegrees(spanDegrees: number): number {
  const padded = Math.max(spanDegrees, MIN_SPAN_DEGREES) * PADDING_FACTOR;
  const zoom = Math.log2(360 / padded);
  if (!Number.isFinite(zoom)) {
    return FALLBACK_ZOOM;
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Camera zoomed in on one point the user picked (e.g. "show on map" for one assignment). */
export function cameraForFocus(point: Coordinate): MapCameraPosition {
  return { coordinates: point, zoom: FOCUS_ZOOM };
}

/**
 * Initial camera for a set of map points: centre on the bounding box and pick a zoom that fits
 * the larger axis. Empty input uses `fallback` (default: Netherlands) at country zoom.
 */
export function cameraForPoints(
  points: readonly Coordinate[],
  fallback: Coordinate = NETHERLANDS_CENTER,
): MapCameraPosition {
  if (points.length === 0) {
    return { coordinates: fallback, zoom: FALLBACK_ZOOM };
  }

  const first = points[0];
  if (first === undefined) {
    return { coordinates: fallback, zoom: FALLBACK_ZOOM };
  }

  if (points.length === 1) {
    return { coordinates: first, zoom: SINGLE_POINT_ZOOM };
  }

  let minLat = first.latitude;
  let maxLat = first.latitude;
  let minLng = first.longitude;
  let maxLng = first.longitude;
  for (const point of points) {
    if (point.latitude < minLat) {
      minLat = point.latitude;
    }
    if (point.latitude > maxLat) {
      maxLat = point.latitude;
    }
    if (point.longitude < minLng) {
      minLng = point.longitude;
    }
    if (point.longitude > maxLng) {
      maxLng = point.longitude;
    }
  }

  return {
    coordinates: {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
    },
    zoom: zoomForSpanDegrees(Math.max(maxLat - minLat, maxLng - minLng)),
  };
}
