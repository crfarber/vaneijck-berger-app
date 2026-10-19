import { pendingOverrideTypeKeys } from './local-copies';
import { photoTypeKey } from './photo-type';
import {
  PHOTO_ROLE,
  PHOTO_STATUS,
  type PhotoPosition,
  type PhotoRole,
  type PhotoStatus,
} from './types';

type OverviewLocal = {
  id: string;
  position: PhotoPosition;
  status: PhotoStatus;
  overrideExisting?: boolean;
  takenAt?: number;
  role?: PhotoRole;
};

type AssignablePhoto = {
  position: PhotoPosition;
  overrideExisting?: boolean;
  role?: PhotoRole;
  source?: 'local' | 'server';
  isExtra?: boolean;
};

/**
 * Locals to show in the overview. For each type with an override (draft/queued/sent), keep only
 * the latest override among mandatory photos — never the earlier sent mandatory sibling — so
 * replacements stay on mandatory tiles. Additional photos of the same type stay visible under Extra.
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
    // Extra photos of an overridden type stay under Extra.
    if (photo.role === PHOTO_ROLE.additional) {
      return true;
    }
    return latestOverrideIdByType.get(key) === photo.id;
  });
}

/**
 * Fill each required slot with one photo of that type. Preference matches the old app:
 * override → local mandatory → server non-extra → server extra. A local additional photo never
 * fills a mandatory tile.
 */
export function pickMandatoryAndExtra<T extends AssignablePhoto>(
  requirements: readonly PhotoPosition[],
  photos: readonly T[],
): { mandatory: (T | null)[]; extra: T[] } {
  const remaining = [...photos];
  const mandatory = requirements.map((position) => {
    const key = photoTypeKey(position);
    const index = bestMandatoryIndex(remaining, key);
    if (index < 0) {
      return null;
    }
    return remaining.splice(index, 1)[0] ?? null;
  });
  return { mandatory, extra: remaining };
}

function bestMandatoryIndex(photos: readonly AssignablePhoto[], key: string): number {
  let bestIndex = -1;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    if (photo === undefined || photoTypeKey(photo.position) !== key) {
      continue;
    }
    const priority = mandatoryPriority(photo);
    if (priority === null || priority >= bestPriority) {
      continue;
    }
    bestPriority = priority;
    bestIndex = index;
  }
  return bestIndex;
}

/** Lower is better. `null` means the photo must not fill a mandatory tile. */
function mandatoryPriority(photo: AssignablePhoto): number | null {
  if (photo.role === PHOTO_ROLE.additional) {
    return null;
  }
  if (photo.overrideExisting === true) {
    return 0;
  }
  if (photo.source !== 'server') {
    return 1;
  }
  if (photo.isExtra === true) {
    return 3;
  }
  return 2;
}

function isNewerOverviewLocal(candidate: OverviewLocal, current: OverviewLocal): boolean {
  const candidateTaken = candidate.takenAt ?? 0;
  const currentTaken = current.takenAt ?? 0;
  if (candidateTaken !== currentTaken) {
    return candidateTaken > currentTaken;
  }
  return candidate.id > current.id;
}
