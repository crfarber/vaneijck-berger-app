import { describe, expect, it } from 'vitest';
import {
  entityMetaFromRecord,
  nextEditedEntityRecord,
  nextEntityRecord,
  parseEditableEntityJson,
  parseStoredEntity,
  serializeEntityRecord,
} from './entity-record';

describe('parseStoredEntity', () => {
  it('returns null for missing or damaged storage', () => {
    expect(parseStoredEntity(null)).toBeNull();
    expect(parseStoredEntity('{')).toBeNull();
    expect(parseStoredEntity('"nope"')).toBeNull();
  });

  it('reads a legacy bare array as data without timestamps', () => {
    expect(parseStoredEntity(JSON.stringify([{ id: 1 }]))).toEqual({
      fetchedAt: null,
      changedAt: null,
      data: [{ id: 1 }],
    });
  });

  it('reads an envelope with timestamps', () => {
    const raw = serializeEntityRecord({
      fetchedAt: '2026-10-08T10:00:00.000Z',
      changedAt: '2026-10-01T10:00:00.000Z',
      data: [{ id: 2 }],
    });
    expect(parseStoredEntity(raw)).toEqual({
      fetchedAt: '2026-10-08T10:00:00.000Z',
      changedAt: '2026-10-01T10:00:00.000Z',
      data: [{ id: 2 }],
    });
  });
});

describe('parseEditableEntityJson', () => {
  it('accepts valid JSON arrays', () => {
    expect(parseEditableEntityJson('[{"id":"local"}]')).toEqual({
      ok: true,
      data: [{ id: 'local' }],
    });
  });

  it('rejects invalid JSON and non-array roots', () => {
    expect(parseEditableEntityJson('{')).toEqual({ ok: false, reason: 'invalid-json' });
    expect(parseEditableEntityJson('{"id":"local"}')).toEqual({
      ok: false,
      reason: 'root-not-array',
    });
  });
});

describe('nextEntityRecord', () => {
  it('sets both timestamps when storing for the first time', () => {
    expect(nextEntityRecord([{ id: 1 }], null, '2026-10-08T12:00:00.000Z')).toEqual({
      fetchedAt: '2026-10-08T12:00:00.000Z',
      changedAt: '2026-10-08T12:00:00.000Z',
      data: [{ id: 1 }],
    });
  });

  it('advances only fetchedAt when the payload is unchanged', () => {
    const previous = nextEntityRecord([{ id: 1 }], null, '2026-10-01T12:00:00.000Z');
    expect(nextEntityRecord([{ id: 1 }], previous, '2026-10-08T12:00:00.000Z')).toEqual({
      fetchedAt: '2026-10-08T12:00:00.000Z',
      changedAt: '2026-10-01T12:00:00.000Z',
      data: [{ id: 1 }],
    });
  });

  it('advances changedAt when the payload differs', () => {
    const previous = nextEntityRecord([{ id: 1 }], null, '2026-10-01T12:00:00.000Z');
    expect(nextEntityRecord([{ id: 2 }], previous, '2026-10-08T12:00:00.000Z')).toEqual({
      fetchedAt: '2026-10-08T12:00:00.000Z',
      changedAt: '2026-10-08T12:00:00.000Z',
      data: [{ id: 2 }],
    });
  });

  it('establishes a changedAt baseline when upgrading identical legacy data', () => {
    const legacy = parseStoredEntity(JSON.stringify([{ id: 1 }]));
    expect(nextEntityRecord([{ id: 1 }], legacy, '2026-10-08T12:00:00.000Z')).toEqual({
      fetchedAt: '2026-10-08T12:00:00.000Z',
      changedAt: '2026-10-08T12:00:00.000Z',
      data: [{ id: 1 }],
    });
  });
});

describe('nextEditedEntityRecord', () => {
  it('updates changedAt but preserves the last server fetchedAt timestamp', () => {
    expect(
      nextEditedEntityRecord(
        [{ id: 2 }],
        {
          fetchedAt: '2026-10-08T10:00:00.000Z',
          changedAt: '2026-10-01T10:00:00.000Z',
          data: [{ id: 1 }],
        },
        '2026-10-08T12:00:00.000Z',
      ),
    ).toEqual({
      fetchedAt: '2026-10-08T10:00:00.000Z',
      changedAt: '2026-10-08T12:00:00.000Z',
      data: [{ id: 2 }],
    });
  });

  it('keeps metadata unchanged when the edited content is identical', () => {
    const previous = {
      fetchedAt: '2026-10-08T10:00:00.000Z',
      changedAt: '2026-10-01T10:00:00.000Z',
      data: [{ id: 1 }],
    };
    expect(nextEditedEntityRecord([{ id: 1 }], previous, '2026-10-08T12:00:00.000Z')).toEqual(
      previous,
    );
  });
});

describe('entityMetaFromRecord', () => {
  it('exposes the timestamps without the rows', () => {
    expect(
      entityMetaFromRecord({
        fetchedAt: 'a',
        changedAt: 'b',
        data: [],
      }),
    ).toEqual({ fetchedAt: 'a', changedAt: 'b' });
  });
});
