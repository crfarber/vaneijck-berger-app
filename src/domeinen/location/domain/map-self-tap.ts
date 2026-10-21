import { distanceInMeters, type Coordinate } from './geo';

/** Fallback when the visible map region is unknown. */
export const DEFAULT_SELF_TAP_THRESHOLD_METERS = 150;

/** One degree of latitude ≈ this many meters. */
const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * How close a map tap must be to the live position to count as "tapped myself".
 * Scales with the visible region so a fat finger still hits the blue dot when zoomed out.
 */
export function selfTapThresholdMeters(latitudeDelta: number | undefined): number {
  if (latitudeDelta === undefined || !Number.isFinite(latitudeDelta) || latitudeDelta <= 0) {
    return DEFAULT_SELF_TAP_THRESHOLD_METERS;
  }
  const fromViewport = latitudeDelta * METERS_PER_DEGREE_LATITUDE * 0.03;
  return Math.max(80, Math.min(2_000, fromViewport));
}

/** True when `tap` is within the self-tap threshold of `self`. */
export function isSelfMapTap(tap: Coordinate, self: Coordinate, latitudeDelta?: number): boolean {
  return distanceInMeters(tap, self) <= selfTapThresholdMeters(latitudeDelta);
}
