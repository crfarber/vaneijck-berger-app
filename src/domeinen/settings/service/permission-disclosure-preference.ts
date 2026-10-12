import type { Logger } from '@/shared/logging/logger';
import type { KeyValueStore } from '@/shared/platform/ports';
import { markDisclosureSeen, parseDisclosureSeenList } from '../domain/permission-disclosure';
import type { PermissionKind } from '../domain/permission-step';

/**
 * Which disclosure steps the berger already dismissed (accept or later). Cleared on sign-out so the
 * next login shows the wizard again; only the language choice survives logout.
 */
export const PERMISSION_DISCLOSURE_SEEN_KEY = 'settings.permissionDisclosure.seen';

export type PermissionDisclosurePreference = {
  readSeen(): Promise<ReadonlySet<PermissionKind>>;
  markSeen(kind: PermissionKind): Promise<ReadonlySet<PermissionKind>>;
  /** Drops progress so the next signed-in session shows the disclosure again. */
  clear(): Promise<void>;
};

export type PermissionDisclosurePreferenceDeps = {
  store: KeyValueStore;
  logger?: Logger;
};

function serializeSeen(seen: ReadonlySet<PermissionKind>): string {
  return JSON.stringify([...seen]);
}

function parseStored(raw: string | null): ReadonlySet<PermissionKind> {
  if (raw === null || raw.trim() === '') {
    return new Set();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    const values = parsed.filter((entry): entry is string => typeof entry === 'string');
    return parseDisclosureSeenList(values);
  } catch {
    return new Set();
  }
}

export function createPermissionDisclosurePreference(
  deps: PermissionDisclosurePreferenceDeps,
): PermissionDisclosurePreference {
  const { store, logger } = deps;

  async function readSeen(): Promise<ReadonlySet<PermissionKind>> {
    try {
      return parseStored(await store.getItem(PERMISSION_DISCLOSURE_SEEN_KEY));
    } catch (error) {
      logger?.warn('app', 'Could not read permission disclosure progress', { error });
      return new Set();
    }
  }

  return {
    readSeen,

    async markSeen(kind) {
      const previous = await readSeen();
      const next = markDisclosureSeen(previous, kind);
      if (next === previous) {
        return previous;
      }
      try {
        await store.setItem(PERMISSION_DISCLOSURE_SEEN_KEY, serializeSeen(next));
      } catch (error) {
        logger?.warn('app', 'Could not save permission disclosure progress', { error });
      }
      return next;
    },

    async clear() {
      try {
        await store.removeItem(PERMISSION_DISCLOSURE_SEEN_KEY);
      } catch (error) {
        logger?.warn('app', 'Could not clear permission disclosure progress', { error });
      }
    },
  };
}
