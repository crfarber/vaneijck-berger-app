import {
  EXTERIOR_ANGLES,
  PHOTO_CATEGORY,
  TYRE_POSITIONS,
  type ExteriorAngle,
  type PhotoCategory,
  type PhotoPosition,
  type TyrePosition,
} from './types';

/** Dutch labels the backend expects in `ImagePosition.name`. */
export const PHOTO_CATEGORY_LABEL: Readonly<Record<PhotoCategory, string>> = {
  OVERVIEW: 'Overzicht',
  EXTERIOR: 'Buitenkant',
  ROOF: 'Dak',
  INTERIOR: 'Interieur',
  DASHBOARD: 'Dashboard',
  ENGINE: 'Motor',
  TYRES: 'Banden',
  TRAILER: 'Aanhangwagen',
  CARGO: 'Lading',
};

export const MANDATORY_PHOTO_CATEGORIES = [
  PHOTO_CATEGORY.OVERVIEW,
  PHOTO_CATEGORY.ROOF,
  PHOTO_CATEGORY.INTERIOR,
  PHOTO_CATEGORY.DASHBOARD,
] as const;

export function isMandatoryPhotoCategory(category: PhotoCategory): boolean {
  return MANDATORY_PHOTO_CATEGORIES.includes(
    category as (typeof MANDATORY_PHOTO_CATEGORIES)[number],
  );
}

/**
 * Stable key for "same photo type" — the unit the `isExtra` rule counts. Exterior and tyres
 * include the sub-position; everything else is one slot per category.
 */
export function photoTypeKey(position: PhotoPosition): string {
  if (position.category === 'EXTERIOR') {
    return `EXTERIOR:${position.angle}`;
  }
  if (position.category === 'TYRES') {
    return `TYRES:${position.tyre}`;
  }
  return `${position.category}:default`;
}

export function photoRequirementName(position: PhotoPosition): string {
  if (position.category === 'EXTERIOR') {
    return position.angle;
  }
  if (position.category === 'TYRES') {
    return `banden:${position.tyre}`;
  }
  return PHOTO_CATEGORY_LABEL[position.category].toLocaleLowerCase('nl');
}

/**
 * Payload for the `ImagePosition` multipart field — `{ name, position? }` as the old app sent it
 * (`toUploadPosition` / `compulsoryPositionToUpload`).
 */
export type ImagePositionPayload = {
  readonly name: string;
  readonly position?: string;
};

export function toImagePosition(position: PhotoPosition): ImagePositionPayload {
  const name = PHOTO_CATEGORY_LABEL[position.category];
  if (position.category === 'EXTERIOR') {
    return { name, position: position.angle };
  }
  if (position.category === 'TYRES') {
    return { name, position: position.tyre };
  }
  return { name };
}

const ANGLE_SET: ReadonlySet<string> = new Set(EXTERIOR_ANGLES);
const TYRE_SET: ReadonlySet<string> = new Set(TYRE_POSITIONS);
const CATEGORY_SET: ReadonlySet<string> = new Set(Object.values(PHOTO_CATEGORY));

export function isExteriorAngle(value: string): value is ExteriorAngle {
  return ANGLE_SET.has(value);
}

export function isTyrePosition(value: string): value is TyrePosition {
  return TYRE_SET.has(value);
}

export function isPhotoCategory(value: string): value is PhotoCategory {
  return CATEGORY_SET.has(value);
}

/** Categories that need no sub-position — usable as a one-tap choice on the screen. */
export function simplePhotoPosition(category: PhotoCategory): PhotoPosition | null {
  if (category === 'EXTERIOR' || category === 'TYRES') {
    return null;
  }
  return { category };
}
