import type { PhotoCategory, PhotoPosition } from './types';

/**
 * 3×3 grid around the vehicle (center = 4 = the car / on-vehicle subject):
 *
 *   0 1 2   ← achter (top)
 *   3 4 5
 *   6 7 8   ← voor (bottom)
 *
 * Surrounding cells = stand positions (exterior, tyres, engine, trailer, cargo).
 * Center = photograph the vehicle itself (roof, interior, dashboard, overview).
 * Front is drawn at the bottom so links-voor sits bottom-left.
 */
const ANGLE_STAND_INDEX: Readonly<Record<string, number>> = {
  'links-achter': 0,
  achter: 1,
  'rechts-achter': 2,
  links: 3,
  rechts: 5,
  'links-voor': 6,
  voor: 7,
  'rechts-voor': 8,
};

/** Categories that mark a part of / on the vehicle (center cell). */
const ON_VEHICLE_INDEX = 4;

const CATEGORY_GRID_INDEX: Readonly<Partial<Record<PhotoCategory, number>>> = {
  OVERVIEW: ON_VEHICLE_INDEX,
  ROOF: ON_VEHICLE_INDEX,
  INTERIOR: ON_VEHICLE_INDEX,
  DASHBOARD: ON_VEHICLE_INDEX,
  ENGINE: 7,
  TRAILER: 1,
  CARGO: 1,
};

/** Cell to highlight on the stand/subject grid, or null when there is no spot. */
export function standGridIndex(position: PhotoPosition): number | null {
  if (position.category === 'EXTERIOR') {
    return ANGLE_STAND_INDEX[position.angle] ?? null;
  }
  if (position.category === 'TYRES') {
    return ANGLE_STAND_INDEX[position.tyre] ?? null;
  }
  return CATEGORY_GRID_INDEX[position.category] ?? null;
}

/** True when the highlight is the vehicle itself (not a place to stand around it). */
export function isOnVehicleSubject(position: PhotoPosition): boolean {
  return standGridIndex(position) === ON_VEHICLE_INDEX;
}
