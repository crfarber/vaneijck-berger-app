import { photoTypeKey } from './photo-type';
import type { Photo } from './types';

/**
 * Whether this photo is the 2nd, 3rd, … of its type in its own phase. The backend accepts only one
 * `isExtra: false` per type; every later copy must be true.
 *
 * Only photos of the same service, phase and type count — a load photo never makes a delivery
 * photo "extra". Matching retakes in delivery then keep the same first/extra pattern as load
 * without copying a stored flag. Already-sent photos in the same phase still count, so a fourth
 * dashboard after an earlier upload stays extra.
 *
 * Order is `takenAt`, then `id` when the clock stamps collide.
 */
export function isExtraForUpload(photo: Photo, photos: readonly Photo[]): boolean {
  const type = photoTypeKey(photo.position);
  const siblings = photos
    .filter(
      (candidate) =>
        candidate.serviceId === photo.serviceId &&
        candidate.phase === photo.phase &&
        photoTypeKey(candidate.position) === type,
    )
    .slice()
    .sort(byTakenAtThenId);

  const index = siblings.findIndex((candidate) => candidate.id === photo.id);
  if (index < 0) {
    return siblings.length > 0;
  }
  return index > 0;
}

function byTakenAtThenId(left: Photo, right: Photo): number {
  if (left.takenAt !== right.takenAt) {
    return left.takenAt - right.takenAt;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
