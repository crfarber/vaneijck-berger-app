import { distanceInMeters, toCoordinate, type Coordinate } from '@/domeinen/location';

/**
 * A company location an internal berger works from during a shift (uitvoerlocatie). The list
 * comes from the `homebaselocations` reference-data entity.
 */
export type HomebaseLocation = {
  id: string;
  name: string;
  street: string | null;
  houseNumber: string | null;
  houseNumberAddition: string | null;
  postalCode: string | null;
  city: string | null;
  coordinate: Coordinate | null;
};

export type SortedHomebaseLocation = {
  location: HomebaseLocation;
  /** Null without a device position or without a location coordinate. */
  distanceMeters: number | null;
  isNearest: boolean;
};

/** The CRM sometimes swaps latitude and longitude; in NL/BE a latitude never lies below 20. */
export function normalizeHomebaseCoordinate(
  latitude: unknown,
  longitude: unknown,
): Coordinate | null {
  const coordinate = toCoordinate(latitude, longitude);
  if (coordinate === null) {
    return null;
  }
  if (Math.abs(coordinate.latitude) < 20 && Math.abs(coordinate.longitude) > 40) {
    return toCoordinate(coordinate.longitude, coordinate.latitude);
  }
  return coordinate;
}

/** "Street 12A, 1234 AB City" without the parts that are missing. */
export function formatHomebaseAddress(location: HomebaseLocation): string {
  const number = [location.houseNumber, location.houseNumberAddition]
    .map((part) => part?.trim() ?? '')
    .join('');
  const streetLine = [location.street?.trim() ?? '', number].filter(Boolean).join(' ');
  const cityLine = [location.postalCode?.trim() ?? '', location.city?.trim() ?? '']
    .filter(Boolean)
    .join(' ');
  return [streetLine, cityLine].filter(Boolean).join(', ');
}

const byName = (a: HomebaseLocation, b: HomebaseLocation): number =>
  a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' });

/**
 * Nearest first when the device position is known (locations without a coordinate last, by name);
 * otherwise alphabetical without a nearest badge.
 */
export function sortHomebaseLocations(
  locations: readonly HomebaseLocation[],
  position: Coordinate | null,
): SortedHomebaseLocation[] {
  if (position === null) {
    return [...locations]
      .sort(byName)
      .map((location) => ({ location, distanceMeters: null, isNearest: false }));
  }
  const measured = locations.map((location) => ({
    location,
    distanceMeters:
      location.coordinate === null ? null : distanceInMeters(position, location.coordinate),
  }));
  measured.sort((a, b) => {
    if (a.distanceMeters === null || b.distanceMeters === null) {
      if (a.distanceMeters === b.distanceMeters) {
        return byName(a.location, b.location);
      }
      return a.distanceMeters === null ? 1 : -1;
    }
    return a.distanceMeters - b.distanceMeters || byName(a.location, b.location);
  });
  return measured.map((entry, index) => ({
    ...entry,
    isNearest: index === 0 && entry.distanceMeters !== null,
  }));
}

/** Case-insensitive match on name or any address part; keeps the given order. */
export function searchHomebaseLocations(
  sorted: readonly SortedHomebaseLocation[],
  query: string,
): SortedHomebaseLocation[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return [...sorted];
  }
  return sorted.filter(({ location }) =>
    [
      location.name,
      location.street,
      location.houseNumber,
      location.houseNumberAddition,
      location.postalCode,
      location.city,
      formatHomebaseAddress(location),
    ].some((value) => value?.toLowerCase().includes(needle) ?? false),
  );
}

/** The remembered location when it still exists, else the nearest one, else nothing. */
export function pickInitialHomebase(
  sorted: readonly SortedHomebaseLocation[],
  rememberedId: string | null,
): HomebaseLocation | null {
  if (rememberedId !== null) {
    const remembered = sorted.find(({ location }) => location.id === rememberedId);
    if (remembered !== undefined) {
      return remembered.location;
    }
  }
  return sorted.find((entry) => entry.isNearest)?.location ?? null;
}
