import { isExteriorAngle, isTyrePosition, photoTypeKey, PHOTO_CATEGORY_LABEL } from './photo-type';
import {
  PHOTO_CATEGORY,
  PHOTO_STATUS,
  type PhotoCategory,
  type PhotoPosition,
  type PhotoStatus,
} from './types';

export const EXTRA_PHOTO_CATEGORIES = [
  PHOTO_CATEGORY.OVERVIEW,
  PHOTO_CATEGORY.EXTERIOR,
  PHOTO_CATEGORY.ROOF,
  PHOTO_CATEGORY.INTERIOR,
  PHOTO_CATEGORY.DASHBOARD,
  PHOTO_CATEGORY.ENGINE,
  PHOTO_CATEGORY.TYRES,
  PHOTO_CATEGORY.TRAILER,
  PHOTO_CATEGORY.CARGO,
] as const satisfies readonly PhotoCategory[];

export function requiresPhotoPositionDetail(
  category: PhotoCategory,
): category is typeof PHOTO_CATEGORY.EXTERIOR | typeof PHOTO_CATEGORY.TYRES {
  return category === PHOTO_CATEGORY.EXTERIOR || category === PHOTO_CATEGORY.TYRES;
}

export function photoPositionForRequirement(name: string): PhotoPosition | null {
  const normalized = name.trim().toLocaleLowerCase('nl');
  const tyre = normalized.slice(7);
  if (normalized.startsWith('banden:') && isTyrePosition(tyre)) {
    return { category: PHOTO_CATEGORY.TYRES, tyre };
  }
  if (isExteriorAngle(normalized)) {
    return { category: PHOTO_CATEGORY.EXTERIOR, angle: normalized };
  }
  for (const [category, label] of Object.entries(PHOTO_CATEGORY_LABEL)) {
    if (
      label.toLocaleLowerCase('nl') === normalized &&
      category !== 'EXTERIOR' &&
      category !== 'TYRES'
    ) {
      return { category: category as Exclude<PhotoCategory, 'EXTERIOR' | 'TYRES'> };
    }
  }
  return null;
}

export function missingPhotoPositions(
  required: readonly PhotoPosition[],
  available: readonly PhotoPosition[],
): PhotoPosition[] {
  const remaining = [...available];
  return required.filter((position) => {
    const index = remaining.findIndex(
      (candidate) => photoTypeKey(candidate) === photoTypeKey(position),
    );
    if (index < 0) {
      return true;
    }
    remaining.splice(index, 1);
    return false;
  });
}

export const unmatchedLoadPhotos = missingPhotoPositions;

export function deliveryPhotoRequirements(
  required: readonly PhotoPosition[],
  loadPhotos: readonly PhotoPosition[],
): PhotoPosition[] {
  return [...required, ...unmatchedLoadPhotos(loadPhotos, required)];
}

export function reconcileHistoryPositions(
  localPhotos: readonly { position: PhotoPosition; status: PhotoStatus }[],
  serverPositions: readonly PhotoPosition[],
  serverLookupComplete: boolean,
): PhotoPosition[] {
  const usableLocal = localPhotos.filter((photo) => photo.status !== PHOTO_STATUS.failed);
  if (serverLookupComplete && serverPositions.length > 0) {
    return [
      ...serverPositions,
      ...usableLocal
        .filter((photo) => photo.status !== PHOTO_STATUS.sent)
        .map((photo) => photo.position),
    ];
  }
  return usableLocal.map((photo) => photo.position);
}
