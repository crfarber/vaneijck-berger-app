import { photoTypeKey } from './photo-type';
import { PHOTO_ROLE, type Photo } from './types';

/**
 * Whether this photo is the 2nd, 3rd, … of its type in its own phase. The backend accepts only one
 * `isExtra: false` per type; every later copy must be true.
 *
 * Only photos of the same service, phase and type count — a load photo never makes a delivery
 * photo "extra". Matching retakes in delivery then keep the same first/extra pattern as load
 * without copying a stored flag. Already-sent photos in the same phase still count, so a fourth
 * dashboard after an earlier upload stays extra.
 *
 * Order is role (mandatory before additional), then `takenAt`, then `id` when stamps collide — so
 * a mandatory photo stays the primary even when an extra of the same type was taken first.
 */
export function isExtraForUpload(
  photo: Photo,
  photos: readonly Photo[],
  existingPositions: readonly Photo['position'][] = [],
): boolean {
  const type = photoTypeKey(photo.position);
  if (existingPositions.some((position) => photoTypeKey(position) === type)) {
    return true;
  }
  const siblings = photos
    .filter(
      (candidate) =>
        candidate.serviceId === photo.serviceId &&
        candidate.phase === photo.phase &&
        photoTypeKey(candidate.position) === type,
    )
    .slice()
    .sort(byRoleThenTakenAtThenId);

  const index = siblings.findIndex((candidate) => candidate.id === photo.id);
  if (index < 0) {
    return siblings.length > 0;
  }
  return index > 0;
}

function byRoleThenTakenAtThenId(left: Photo, right: Photo): number {
  const leftMandatory = left.role === PHOTO_ROLE.mandatory ? 0 : 1;
  const rightMandatory = right.role === PHOTO_ROLE.mandatory ? 0 : 1;
  if (leftMandatory !== rightMandatory) {
    return leftMandatory - rightMandatory;
  }
  if (left.takenAt !== right.takenAt) {
    return left.takenAt - right.takenAt;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
