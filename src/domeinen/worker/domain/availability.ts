/**
 * CRM availability statuses for the signed-in berger (`dn_availabilitystatuscode`).
 * Codes and filtering rules are ported from the old TopBar / WorkerStatus behaviour; labels
 * come from reference data (or i18n fallbacks), not from this file.
 */
export const WORKER_AVAILABILITY = {
  AVAILABLE: 875920000,
  UNAVAILABLE: 875920001,
  NOT_ON_DUTY: 875920002,
  BREAK: 875920003,
  TRAINING: 875920004,
  MEETING: 875920005,
  AVAILABLE_ON_CALL: 875920006,
  BACKUP: 875920007,
  /** Actively working — shown on the pill, never offered as a choice. */
  BUSY: 875920008,
} as const;

export type WorkerAvailabilityCode = (typeof WORKER_AVAILABILITY)[keyof typeof WORKER_AVAILABILITY];

/** Theme tone for the status pill. */
export type AvailabilityTone = 'success' | 'warning' | 'danger';

/** One choosable (or display) availability row from reference data. */
export type AvailabilityOption = { readonly value: number; readonly text: string };

/**
 * How the berger signed in. Externals only get available / unavailable; internals get every
 * status except "busy". Taken from the session's login method, not from `dn_workertypecode`.
 */
export type WorkerUserKind = 'internal' | 'external';

/**
 * i18n key suffix under `worker.availability.codes.*` for a known CRM code, or null when the
 * code is unknown and only a generic fallback makes sense.
 */
export type AvailabilityFallbackKey =
  | 'available'
  | 'unavailable'
  | 'notOnDuty'
  | 'break'
  | 'training'
  | 'meeting'
  | 'availableOnCall'
  | 'backup'
  | 'busy';

const FALLBACK_KEYS: ReadonlyMap<number, AvailabilityFallbackKey> = new Map([
  [WORKER_AVAILABILITY.AVAILABLE, 'available'],
  [WORKER_AVAILABILITY.UNAVAILABLE, 'unavailable'],
  [WORKER_AVAILABILITY.NOT_ON_DUTY, 'notOnDuty'],
  [WORKER_AVAILABILITY.BREAK, 'break'],
  [WORKER_AVAILABILITY.TRAINING, 'training'],
  [WORKER_AVAILABILITY.MEETING, 'meeting'],
  [WORKER_AVAILABILITY.AVAILABLE_ON_CALL, 'availableOnCall'],
  [WORKER_AVAILABILITY.BACKUP, 'backup'],
  [WORKER_AVAILABILITY.BUSY, 'busy'],
]);

/** "Bezig met opdracht(en)" is display-only: the berger cannot change it themselves. */
export function isAvailabilityEditable(code: number | null | undefined): boolean {
  return code !== WORKER_AVAILABILITY.BUSY;
}

export function availabilityTone(code: number | null | undefined): AvailabilityTone {
  switch (code) {
    case WORKER_AVAILABILITY.AVAILABLE:
    case WORKER_AVAILABILITY.AVAILABLE_ON_CALL:
      return 'success';
    case WORKER_AVAILABILITY.UNAVAILABLE:
    case WORKER_AVAILABILITY.NOT_ON_DUTY:
    case WORKER_AVAILABILITY.MEETING:
    case WORKER_AVAILABILITY.BUSY:
      return 'danger';
    default:
      return 'warning';
  }
}

/**
 * Which statuses to offer on the change screen. External bergers only see available /
 * unavailable; internals see everything except busy (875920008).
 */
export function filterAvailabilityOptions(
  options: readonly AvailabilityOption[],
  userKind: WorkerUserKind,
): AvailabilityOption[] {
  if (userKind === 'external') {
    return options.filter(
      (option) =>
        option.value === WORKER_AVAILABILITY.AVAILABLE ||
        option.value === WORKER_AVAILABILITY.UNAVAILABLE,
    );
  }
  return options.filter((option) => option.value !== WORKER_AVAILABILITY.BUSY);
}

export function availabilityFallbackKey(
  code: number | null | undefined,
): AvailabilityFallbackKey | null {
  if (code === null || code === undefined) {
    return null;
  }
  return FALLBACK_KEYS.get(code) ?? null;
}
