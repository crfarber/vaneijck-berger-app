export type Coordinate = { readonly latitude: number; readonly longitude: number };

/** Mean radius of the earth in meters. */
const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Distance over the surface in meters (haversine). Within a few tenths of a percent of the
 * ellipsoidal distance, far better than needed for the 500 meter check.
 */
export function distanceInMeters(from: Coordinate, to: Coordinate): number {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** CRM coordinates arrive as numbers, sometimes as numeric text. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * A usable coordinate: both parts present, on the globe, and not (0, 0), which is what a missing
 * position looks like. The old app accepted a position when EITHER part was non-zero.
 */
export function toCoordinate(latitude: unknown, longitude: unknown): Coordinate | null {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  if (lat === null || lng === null) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  if (lat === 0 && lng === 0) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}
