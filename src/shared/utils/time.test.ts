import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import { formatEndDate, formatRemainingTime } from './time';

describe('formatEndDate', () => {
  const value = '2026-09-24T21:30:00.000Z';
  const utc = { timeZone: 'UTC' };

  it('formats only the time when requested', () => {
    expect(formatEndDate(value, 'en-US', { ...utc, timeStyle: 'short' })).toBe('9:30 PM');
  });

  it('formats the date and time when requested', () => {
    expect(
      formatEndDate(value, 'en-US', {
        ...utc,
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    ).toBe('Sep 24, 2026, 9:30 PM');
  });

  it('returns null for a missing or invalid date', () => {
    expect(formatEndDate(null, 'en-US', { ...utc, timeStyle: 'short' })).toBeNull();
    expect(formatEndDate('invalid', 'en-US', { ...utc, timeStyle: 'short' })).toBeNull();
  });
});

describe('formatRemainingTime', () => {
  const translate = vi.fn(
    (key: string, options?: Record<string, unknown>) => `${key}:${JSON.stringify(options ?? {})}`,
  ) as unknown as TFunction;

  it('translates missing remaining time', () => {
    expect(formatRemainingTime(null, translate)).toBe('unit.overview.notSet:{}');
  });

  it('translates minutes below one hour', () => {
    expect(formatRemainingTime(16, translate)).toBe(
      'unit.overview.remainingMinutes:{"minutes":16}',
    );
  });

  it('translates hours and remaining minutes', () => {
    expect(formatRemainingTime(136, translate)).toBe(
      'unit.overview.remainingHoursMinutes:{"hours":2,"minutes":16}',
    );
  });
});
