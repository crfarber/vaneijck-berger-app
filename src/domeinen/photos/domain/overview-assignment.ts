import { pendingOverrideTypeKeys } from './local-copies';
import { photoTypeKey } from './photo-type';
import { PHOTO_STATUS, type PhotoPosition, type PhotoStatus } from './types';

type OverviewLocal = {
  id: string;
  position: PhotoPosition;
  status: PhotoStatus;
  overrideExisting?: boolean;
  takenAt?: number;
};

/**
 * Locals to show in the overview. For each type with an override (draft/queued/sent), keep only
 * the latest override — never the earlier sent sibling — so replacements stay on mandatory tiles.
 */
export function localsForOverview<T extends OverviewLocal>(local: readonly T[]): T[] {
  const overrideTypes = pendingOverrideTypeKeys(local);
  if (overrideTypes.size === 0) {
    return [...local];
  }
  const latestOverrideIdByType = new Map<string, string>();
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
    const key = photoTypeKey(photo.position);
    if (!overrideTypes.has(key)) {
      continue;
    }
    const currentId = latestOverrideIdByType.get(key);
    if (currentId === undefined) {
      latestOverrideIdByType.set(key, photo.id);
      continue;
    }
    const current = local.find((item) => item.id === currentId);
    if (current !== undefined && isNewerOverviewLocal(photo, current)) {
      latestOverrideIdByType.set(key, photo.id);
    }
  }
  return local.filter((photo) => {
    const key = photoTypeKey(photo.position);
    if (!overrideTypes.has(key)) {
      return true;
    }
    return latestOverrideIdByType.get(key) === photo.id;
  });
}

/**
 * Fill each required slot with one photo of that type. Prefer an override when both an original
 * and a replacement are still in the pool (so two retakes do not land under Extra).
 */
export function pickMandatoryAndExtra<
  T extends { position: PhotoPosition; overrideExisting?: boolean },
>(
  requirements: readonly PhotoPosition[],
  photos: readonly T[],
): { mandatory: (T | null)[]; extra: T[] } {
  const remaining = [...photos];
  const mandatory = requirements.map((position) => {
    const key = photoTypeKey(position);
    const overrideIndex = remaining.findIndex(
      (photo) => photoTypeKey(photo.position) === key && photo.overrideExisting === true,
    );
    const index =
      overrideIndex >= 0
        ? overrideIndex
        : remaining.findIndex((photo) => photoTypeKey(photo.position) === key);
    if (index < 0) {
      return null;
    }
    return remaining.splice(index, 1)[0] ?? null;
  });
  return { mandatory, extra: remaining };
}

function isNewerOverviewLocal(candidate: OverviewLocal, current: OverviewLocal): boolean {
  const candidateTaken = candidate.takenAt ?? 0;
  const currentTaken = current.takenAt ?? 0;
  if (candidateTaken !== currentTaken) {
    return candidateTaken > currentTaken;
  }
  return candidate.id > current.id;
}
