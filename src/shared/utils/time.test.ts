import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import {
  formatActiveUntil,
  formatEndDate,
  formatInstantTime,
  formatRemainingTime,
  getDeviceTimeZone,
} from './time';

describe('getDeviceTimeZone', () => {
  it('returns a non-empty timezone id', () => {
    expect(getDeviceTimeZone().length).toBeGreaterThan(0);
  });
});

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

  it('defaults to the device timezone when none is passed', () => {
    const withDevice = formatEndDate(value, 'nl-NL', { timeStyle: 'short' });
    const explicit = formatEndDate(value, 'nl-NL', {
      timeStyle: 'short',
      timeZone: getDeviceTimeZone(),
    });
    expect(withDevice).toBe(explicit);
  });

  it('returns null for a missing or invalid date', () => {
    expect(formatEndDate(null, 'en-US', { ...utc, timeStyle: 'short' })).toBeNull();
    expect(formatEndDate('invalid', 'en-US', { ...utc, timeStyle: 'short' })).toBeNull();
  });
});

describe('formatInstantTime', () => {
  const noonUtc = Date.parse('2026-10-08T12:00:00.000Z');

  it('shows Dutch summer time for Europe/Amsterdam', () => {
    expect(formatInstantTime(noonUtc, 'nl-NL', 'Europe/Amsterdam')).toBe('14:00');
  });

  it('shows British summer time for Europe/London', () => {
    expect(formatInstantTime(noonUtc, 'en-GB', 'Europe/London')).toBe('13:00');
  });
});

describe('formatActiveUntil', () => {
  const labels = { today: 'Vandaag', tomorrow: 'Morgen' };
  // CEST (UTC+2) / BST (UTC+1) still apply on this date.
  const now = Date.parse('2026-10-08T10:00:00.000Z');
  const utcNoon = '2026-10-08T12:00:00.000Z';

  it('shows Dutch summer time for Europe/Amsterdam (UTC+2)', () => {
    expect(formatActiveUntil(utcNoon, 'nl-NL', now, labels, 'Europe/Amsterdam')).toBe(
      'Vandaag 14:00',
    );
  });

  it('shows British summer time for Europe/London (UTC+1)', () => {
    expect(formatActiveUntil(utcNoon, 'en-GB', now, labels, 'Europe/London')).toBe('Vandaag 13:00');
  });

  it('shows UTC when the device timezone is UTC', () => {
    expect(formatActiveUntil(utcNoon, 'en-GB', now, labels, 'UTC')).toBe('Vandaag 12:00');
  });

  it('labels the same calendar day as today in the given timezone', () => {
    expect(
      formatActiveUntil('2026-10-08T14:59:00.000Z', 'nl-NL', now, labels, 'Europe/Amsterdam'),
    ).toMatch(/^Vandaag /);
  });

  it('labels the next calendar day as tomorrow in the given timezone', () => {
    expect(
      formatActiveUntil('2026-10-09T14:59:00.000Z', 'nl-NL', now, labels, 'Europe/Amsterdam'),
    ).toMatch(/^Morgen /);
  });

  it('uses the timezone calendar day near midnight, not UTC', () => {
    // 2026-10-08 23:30 Amsterdam = 21:30Z; still "today" in Amsterdam while UTC day is the 8th.
    const lateAmsterdam = Date.parse('2026-10-08T21:30:00.000Z');
    // End at 00:30 Amsterdam next calendar day = 2026-10-08T22:30:00.000Z
    expect(
      formatActiveUntil(
        '2026-10-08T22:30:00.000Z',
        'nl-NL',
        lateAmsterdam,
        labels,
        'Europe/Amsterdam',
      ),
    ).toMatch(/^Morgen /);
  });

  it('returns null for a missing or invalid date', () => {
    expect(formatActiveUntil(null, 'nl-NL', now, labels, 'Europe/Amsterdam')).toBeNull();
    expect(formatActiveUntil('invalid', 'nl-NL', now, labels, 'Europe/Amsterdam')).toBeNull();
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
