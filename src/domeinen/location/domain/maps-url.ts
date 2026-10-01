import type { Coordinate } from './geo';

/** Google Maps search URL for a coordinate — same format the old GPS modal used. */
export function googleMapsSearchUrl(coordinate: Coordinate): string {
  return `https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`;
}
