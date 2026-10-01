import { describe, expect, it } from 'vitest';
import { isSyncComplete, parseStoredPending, withoutEntity } from './sync-state';

describe('parseStoredPending', () => {
  it('is null without a stored value', () => {
    expect(parseStoredPending(null)).toBeNull();
    expect(parseStoredPending('')).toBeNull();
  });

  it('reads a valid batch', () => {
    const raw = JSON.stringify({ since: '2026-09-22T10:00:00.000Z', entities: ['a', 'b'] });
    expect(parseStoredPending(raw)).toEqual({
      since: '2026-09-22T10:00:00.000Z',
      entities: ['a', 'b'],
    });
  });

  it.each([
    ['not JSON', 'garbage'],
    ['missing since', JSON.stringify({ entities: ['a'] })],
    ['empty since', JSON.stringify({ since: '', entities: ['a'] })],
    ['entities not an array of strings', JSON.stringify({ since: 'x', entities: [1, 2] })],
    ['a plain array', JSON.stringify(['a', 'b'])],
  ])('treats %s as no batch', (_label, raw) => {
    expect(parseStoredPending(raw)).toBeNull();
  });
});

describe('withoutEntity', () => {
  it('removes one entity and keeps the rest', () => {
    const pending = { since: 'x', entities: ['a', 'b', 'c'] };
    expect(withoutEntity(pending, 'b')).toEqual({ since: 'x', entities: ['a', 'c'] });
  });

  it('is a no-op when the entity is not in the batch', () => {
    const pending = { since: 'x', entities: ['a'] };
    expect(withoutEntity(pending, 'z')).toEqual({ since: 'x', entities: ['a'] });
  });
});

describe('isSyncComplete', () => {
  it('is true once no entities remain', () => {
    expect(isSyncComplete({ since: 'x', entities: [] })).toBe(true);
  });

  it('is false while entities remain', () => {
    expect(isSyncComplete({ since: 'x', entities: ['a'] })).toBe(false);
  });
});
