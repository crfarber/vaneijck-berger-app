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
