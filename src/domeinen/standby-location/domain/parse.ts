import { toCoordinate } from '@/domeinen/location';
import type { StandbyLocationAdviceFields } from './types';

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = readString(value);
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
}

/**
 * Reads a standby advice from a flattened push payload. Requires usable latitude and longitude
 * (same rules as `toCoordinate`). Returns null when coordinates are missing or invalid.
 */
export function parseStandbyLocationAdvice(
  payload: Readonly<Record<string, unknown>>,
): StandbyLocationAdviceFields | null {
  const coordinate = toCoordinate(
    payload.latitude ?? payload.Latitude,
    payload.longitude ?? payload.Longitude,
  );
  if (coordinate === null) {
    return null;
  }

  return {
    standbyLocationId: firstString(payload.standbyLocationId, payload.StandbyLocationId) ?? '',
    name: firstString(payload.name, payload.Name),
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    street: firstString(payload.street, payload.Street),
    houseNo: firstString(payload.houseNo, payload.HouseNo),
    city: firstString(payload.city, payload.City),
    postalCode: firstString(payload.postalCode, payload.PostalCode),
  };
}
