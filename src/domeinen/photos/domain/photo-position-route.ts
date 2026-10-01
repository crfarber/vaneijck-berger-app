import {
  isExteriorAngle,
  isPhotoCategory,
  isTyrePosition,
  simplePhotoPosition,
} from './photo-type';
import { PHOTO_CATEGORY, type PhotoPosition } from './types';

export function photoPositionToRouteParam(position: PhotoPosition): string {
  return JSON.stringify(position);
}

export function photoPositionFromRouteParam(value: string | undefined): PhotoPosition | null {
  if (value === undefined) {
    return null;
  }

  try {
    return photoPositionFromUnknown(JSON.parse(value));
  } catch {
    return null;
  }
}

function photoPositionFromUnknown(value: unknown): PhotoPosition | null {
  if (!isRecord(value) || typeof value.category !== 'string' || !isPhotoCategory(value.category)) {
    return null;
  }

  if (value.category === PHOTO_CATEGORY.EXTERIOR) {
    return typeof value.angle === 'string' && isExteriorAngle(value.angle)
      ? { category: PHOTO_CATEGORY.EXTERIOR, angle: value.angle }
      : null;
  }

  if (value.category === PHOTO_CATEGORY.TYRES) {
    return typeof value.tyre === 'string' && isTyrePosition(value.tyre)
      ? { category: PHOTO_CATEGORY.TYRES, tyre: value.tyre }
      : null;
  }

  return simplePhotoPosition(value.category);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
