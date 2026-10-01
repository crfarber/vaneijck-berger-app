/**
 * Working hours of the berger: until when is the unit available. The rules are:
 * the end must be in the future and at most 24 hours away.
 *
 * Every function takes `now` explicitly, so the rules can be tested without a clock.
 */

const HOUR_MS = 60 * 60 * 1000;
export const MAX_SHIFT_HOURS = 24;
export const DEFAULT_SHIFT_HOURS = 8;

export type ParsedTime = { hours: number; minutes: number };

export function isInPast(date: Date, now: Date): boolean {
  return date.getTime() <= now.getTime();
}

export function isBeyond24Hours(date: Date, now: Date): boolean {
  return date.getTime() > now.getTime() + MAX_SHIFT_HOURS * HOUR_MS;
}

export type EndDateValidationError = 'inPast' | 'beyond24';

export type EndDateValidation = { valid: true } | { valid: false; error: EndDateValidationError };

export function validateEndDate(endDate: Date, now: Date): EndDateValidation {
  if (Number.isNaN(endDate.getTime()) || isInPast(endDate, now)) {
    return { valid: false, error: 'inPast' };
  }
  if (isBeyond24Hours(endDate, now)) {
    return { valid: false, error: 'beyond24' };
  }
  return { valid: true };
}

/** Parses typed time: `HH:MM`, `H:MM`, `HHMM`, `HMM` or `MM`. Returns null for empty input or anything that is not a time of day. */
export function parseTimeInput(input: string): ParsedTime | null {
  const cleaned = input.replace(/[^\d:]/g, '');
  if (cleaned === '') {
    return null;
  }

  let hoursText: string;
  let minutesText: string;

  if (cleaned.includes(':')) {
    const [hoursPart, minutesPart] = cleaned.split(':');
    hoursText = hoursPart || '0';
    minutesText = minutesPart || '0';
  } else if (cleaned.length <= 4) {
    const padded = cleaned.padStart(4, '0');
    hoursText = padded.slice(0, 2);
    minutesText = padded.slice(2, 4);
  } else {
    return null;
  }

  const hours = Number.parseInt(hoursText, 10);
  const minutes = Number.parseInt(minutesText, 10);
  const inRange = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;

  return inRange ? { hours, minutes } : null;
}

/** Now plus a number of hours. */
export function getRelativeEndDate(hoursOffset: number, now: Date): Date {
  return new Date(now.getTime() + hoursOffset * HOUR_MS);
}

export function getDefaultEndDate(now: Date): Date {
  return getRelativeEndDate(DEFAULT_SHIFT_HOURS, now);
}

/** Time left until the end date, rounded down to whole minutes. Never negative. */
export function getDurationFromNow(endDate: Date, now: Date): ParsedTime {
  const diffMs = Math.max(0, endDate.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/**
 * Sets a time of day on a date. When that moment has already passed, the next day is meant.
 * Does no validation against the 24 hour window; use `validateEndDate` for that.
 */
export function applyTimeOfDay(base: Date | null, hours: number, minutes: number, now: Date): Date {
  const result = new Date(base ?? now);
  result.setHours(hours, minutes, 0, 0);
  if (result.getTime() <= now.getTime()) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/** Sets day, month and year on a date and keeps its time of day. `month` counts from 1. */
export function applyCalendarDate(
  base: Date | null,
  day: number,
  month: number,
  year: number,
  now: Date,
): Date {
  const result = new Date(base ?? now);
  result.setFullYear(year, month - 1, day);
  result.setSeconds(0, 0);
  return result;
}

export type ParsedDate = { day: number; month: number; year: number };

const MAX_DATE_DIGITS = 8;

/** `DD / MM / YYYY` for a date field, or empty when there is no date yet. */
export function formatDateForDisplay(date: Date | null): string {
  if (date === null) {
    return '';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day} / ${month} / ${year}`;
}

/** Digits only, at most eight, with separators after day and month (`17062026` → `17 / 06 / 2026`). */
export function formatDateInputForDisplay(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, MAX_DATE_DIGITS);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`;
}

/** A calendar day from typed `DD / MM / YYYY`. Null when the input is incomplete or not a real day. */
export function parseDateInput(input: string): ParsedDate | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length < MAX_DATE_DIGITS) {
    return null;
  }

  const day = Number.parseInt(digits.slice(0, 2), 10);
  const month = Number.parseInt(digits.slice(2, 4), 10);
  const year = Number.parseInt(digits.slice(4, 8), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return { day, month, year };
}

/** `HH:MM` for a time field, or empty when there is no date yet. */
export function formatTimeForDisplay(date: Date | null): string {
  if (date === null) {
    return '';
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Digits only, at most four, with a colon after the hour (`1430` → `14:30`). */
export function formatTimeInputForDisplay(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Handles a value from the native date or time picker. A picked date keeps the time of day of the
 * earlier end date; a picked time keeps its date. Anything already past moves to the next day.
 */
export function applyPickerValue(
  previous: Date | null,
  picked: Date,
  mode: 'date' | 'time',
  now: Date,
): Date {
  const result = new Date(previous ?? now);

  if (mode === 'date') {
    const hours = result.getHours();
    const minutes = result.getMinutes();
    result.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    result.setHours(hours, minutes, 0, 0);
  } else {
    result.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  }

  if (result.getTime() <= now.getTime()) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}
