import type { TFunction } from 'i18next';

/** IANA timezone of the device (e.g. Europe/Amsterdam, Europe/London). */
export function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Formats an ISO timestamp for display. Defaults to the device timezone so CMS UTC
 * values (e.g. …Z) show as local wall time in NL/EN.
 */
export function formatEndDate(
  value: string | null,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string | null {
  if (value === null) {
    return null;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Intl.DateTimeFormat(locale, {
    timeZone: getDeviceTimeZone(),
    ...options,
  }).format(timestamp);
}

/** Short clock time for an epoch ms instant (notifications, location stamp, …). */
export function formatInstantTime(
  epochMs: number,
  locale: string,
  timeZone: string = getDeviceTimeZone(),
): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(epochMs);
}

/** Relative day label + short time, e.g. "Vandaag 16:59". CMS stores UTC; display uses `timeZone`. */
export function formatActiveUntil(
  value: string | null,
  locale: string,
  now: number,
  labels: { today: string; tomorrow: string },
  timeZone: string = getDeviceTimeZone(),
): string | null {
  if (value === null) {
    return null;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  const end = new Date(timestamp);
  const current = new Date(now);
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(end);
  const dayOffset = calendarDayOffset(current, end, timeZone);
  if (dayOffset === 0) {
    return `${labels.today} ${time}`;
  }
  if (dayOffset === 1) {
    return `${labels.tomorrow} ${time}`;
  }
  return formatEndDate(value, locale, { dateStyle: 'medium', timeStyle: 'short', timeZone });
}

function calendarDayOffset(from: Date, to: Date, timeZone: string): number {
  const start = calendarDayUtcMs(from, timeZone);
  const end = calendarDayUtcMs(to, timeZone);
  return Math.round((end - start) / 86_400_000);
}

/** Midnight UTC of the calendar day of `date` in `timeZone`. */
function calendarDayUtcMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return Date.UTC(year, month - 1, day);
}

export function formatRemainingTime(minutes: number | null, translate: TFunction) {
  if (minutes === null) {
    return translate('unit.overview.notSet');
  }
  if (minutes < 60) {
    return translate('unit.overview.remainingMinutes', { minutes });
  }

  return translate('unit.overview.remainingHoursMinutes', {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  });
}
