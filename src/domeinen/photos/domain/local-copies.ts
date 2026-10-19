import { photoTypeKey } from './photo-type';
import { PHOTO_STATUS, type PhotoPosition, type PhotoStatus } from './types';

/**
 * For each server photo, the local sent photo of the same type that can be shown instead, or null.
 * Each local photo is used at most once, in list order.
 */
export function matchLocalCopies<T extends { position: PhotoPosition; status: PhotoStatus }>(
  server: readonly { position: PhotoPosition }[],
  local: readonly T[],
): (T | null)[] {
  const available = local.filter((photo) => photo.status === PHOTO_STATUS.sent);
  return server.map((photo) => {
    const key = photoTypeKey(photo.position);
    const index = available.findIndex((candidate) => photoTypeKey(candidate.position) === key);
    return index < 0 ? null : (available.splice(index, 1)[0] ?? null);
  });
}

/**
 * Photo types that have a local mandatory override (`overrideExisting`) in draft, queued, or sent.
 * The overview hides the non-extra server photo of those types so a replacement stays on the
 * mandatory tile; server extras of the same type remain under Extra.
 */
export function pendingOverrideTypeKeys(
  local: readonly {
    position: PhotoPosition;
    status: PhotoStatus;
    overrideExisting?: boolean;
  }[],
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const photo of local) {
    if (photo.overrideExisting !== true) {
      continue;
    }
    if (
      photo.status !== PHOTO_STATUS.draft &&
      photo.status !== PHOTO_STATUS.queued &&
      photo.status !== PHOTO_STATUS.sent
    ) {
      continue;
    }
    keys.add(photoTypeKey(photo.position));
  }
  return keys;
}
