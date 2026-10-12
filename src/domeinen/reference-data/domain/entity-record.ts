/**
 * Local envelope around synced entity rows. Older installs store a bare array; readers accept both.
 * `fetchedAt` is always the last successful download. `changedAt` advances only when the payload
 * differs from what was already stored (so a no-op refresh does not look like new data).
 */
export type EntityRecord = {
  readonly fetchedAt: string | null;
  readonly changedAt: string | null;
  readonly data: unknown[];
};

export type EntityMeta = {
  readonly fetchedAt: string | null;
  readonly changedAt: string | null;
};

export type EditableEntityJsonResult =
  { ok: true; data: unknown[] } | { ok: false; reason: 'invalid-json' | 'root-not-array' };

export function parseEditableEntityJson(content: string): EditableEntityJsonResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  return Array.isArray(parsed)
    ? { ok: true, data: parsed }
    : { ok: false, reason: 'root-not-array' };
}

function isEntityRecord(value: unknown): value is EntityRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as {
    fetchedAt?: unknown;
    changedAt?: unknown;
    data?: unknown;
  };
  return (
    (record.fetchedAt === null || typeof record.fetchedAt === 'string') &&
    (record.changedAt === null || typeof record.changedAt === 'string') &&
    Array.isArray(record.data)
  );
}

/** Parses stored JSON: envelope, legacy bare array, or unreadable → null. */
export function parseStoredEntity(raw: string | null): EntityRecord | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isEntityRecord(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed)) {
      return { fetchedAt: null, changedAt: null, data: parsed };
    }
    return null;
  } catch {
    return null;
  }
}

export function entityMetaFromRecord(record: EntityRecord): EntityMeta {
  return { fetchedAt: record.fetchedAt, changedAt: record.changedAt };
}

/** Builds the envelope to persist after a successful fetch. */
export function nextEntityRecord(
  data: unknown[],
  previous: EntityRecord | null,
  nowIso: string,
): EntityRecord {
  const previousData = previous?.data ?? null;
  const contentChanged =
    previousData === null || JSON.stringify(previousData) !== JSON.stringify(data);
  // Legacy bare arrays have no timestamps: the first envelope write establishes a baseline so the
  // settings screen is not stuck on "unknown" until the payload happens to change.
  const establishingBaseline = previous === null || previous.fetchedAt === null;
  return {
    fetchedAt: nowIso,
    changedAt: contentChanged || establishingBaseline ? nowIso : previous.changedAt,
    data,
  };
}

/** Builds a locally edited record without claiming the data was downloaded again. */
export function nextEditedEntityRecord(
  data: unknown[],
  previous: EntityRecord | null,
  nowIso: string,
): EntityRecord {
  const contentChanged =
    previous === null || JSON.stringify(previous.data) !== JSON.stringify(data);
  return {
    fetchedAt: previous?.fetchedAt ?? null,
    changedAt: contentChanged ? nowIso : (previous?.changedAt ?? null),
    data,
  };
}

export function serializeEntityRecord(record: EntityRecord): string {
  return JSON.stringify(record);
}
