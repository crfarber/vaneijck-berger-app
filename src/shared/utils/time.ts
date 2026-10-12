import type { TFunction } from 'i18next';

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
    ...options,
  }).format(timestamp);
}

/** Relative day label + short time, e.g. "Vandaag 16:59". */
export function formatActiveUntil(
  value: string | null,
  locale: string,
  now: number,
  labels: { today: string; tomorrow: string },
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
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(end);
  const dayOffset = calendarDayOffset(current, end);
  if (dayOffset === 0) {
    return `${labels.today} ${time}`;
  }
  if (dayOffset === 1) {
    return `${labels.tomorrow} ${time}`;
  }
  return formatEndDate(value, locale, { dateStyle: 'medium', timeStyle: 'short' });
}

function calendarDayOffset(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86_400_000);
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
