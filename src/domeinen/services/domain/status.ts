import { SERVICE_TYPE } from './service-types';

/**
 * CRM status codes (`statuscode`) of a service, and the rules that hang on them.
 * The names follow docs/functioneel/statussen.md; the numbers are the CRM option-set values.
 *
 * NOTE: the old app also listed `VERVALLEN` with 875920018, the same number as
 * DOORBROEP_CONTROLE (marked "controleer waardes"). A code cannot have two meanings, so
 * VERVALLEN is left out until the real value is confirmed (see docs/functioneel/open-vragen.md).
 */
export const SERVICE_STATUS = {
  // Active
  NOG_AANSTUREN: 875920014,
  WACHT_OP_ACCEPTATIE_TP: 1,
  IN_UITVOERING: 875920000,
  HULPVERLENING_AKKOORD: 875920004,
  HULPVERLENING_AFGEROND: 875920005,
  LAATSTE_BERICHT: 875920003,
  VERGEEFSE_RIT: 875920006,
  NACONTROLE: 875920007,
  AFMELDING_GEWEIGERD: 875920017,
  OPSLAG: 875920009,
  WACHT_OP_ORDERNUMMER: 875920010,
  DOORBROEP_CONTROLE: 875920018,
  GECONTROLEERD: 875920016,
  NOG_ONDERWEG: 875920019,
  FACTUREERBAAR: 875920008,
  // Inactive
  GEFACTUREERD: 875920012,
  FACTUUR_OP_VERVOLGDIENST: 875920013,
  DUPLICAATMELDING: 875920011,
  COULANCE: 875920020,
  GECORRIGEERD_OP_ANDERE_DIENST: 875920021,
} as const;

export type ServiceStatusName = keyof typeof SERVICE_STATUS;

const NAME_BY_CODE: ReadonlyMap<number, ServiceStatusName> = new Map(
  (Object.keys(SERVICE_STATUS) as ServiceStatusName[]).map((name) => [SERVICE_STATUS[name], name]),
);

export function getServiceStatusName(
  statuscode: number | undefined,
): ServiceStatusName | 'UNKNOWN' {
  return (statuscode !== undefined && NAME_BY_CODE.get(statuscode)) || 'UNKNOWN';
}

/** Statuses in which the berger may still send data for a service. */
const SUBMIT_ALLOWED: ReadonlySet<number> = new Set([
  SERVICE_STATUS.NOG_AANSTUREN,
  SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP,
  SERVICE_STATUS.IN_UITVOERING,
  SERVICE_STATUS.HULPVERLENING_AKKOORD,
  SERVICE_STATUS.HULPVERLENING_AFGEROND,
  SERVICE_STATUS.LAATSTE_BERICHT,
]);

/** UI "In uitvoering" used on active services; not a named `SERVICE_STATUS` entry. */
const IN_UITVOERING_UI = 875920001;

/**
 * Extra statuses from which Afgifte / locatie-afgifte may still submit (legacy
 * `isSubmitAllowedForStatus` with `isReleaseItem` / typecode 9000).
 */
const AFGIFTE_EXTRA_SUBMIT: ReadonlySet<number> = new Set([
  SERVICE_STATUS.OPSLAG,
  IN_UITVOERING_UI,
]);

export type SubmitStatusContext = {
  /** Location release: vehicle in storage may still be handed over. */
  isReleaseItem?: boolean;
  /** Assigned Afgifte service typecode (9000). */
  serviceTypeCode?: number | null;
};

/** Whether a submit for a service in this status is allowed. Unknown or missing: no. */
export function isSubmitAllowed(
  statuscode: number | undefined,
  ctx?: SubmitStatusContext,
): boolean {
  if (statuscode === undefined) {
    return false;
  }
  const afgifteFlow = ctx?.isReleaseItem === true || ctx?.serviceTypeCode === SERVICE_TYPE.AFGIFTE;
  if (afgifteFlow && AFGIFTE_EXTRA_SUBMIT.has(statuscode)) {
    return true;
  }
  return SUBMIT_ALLOWED.has(statuscode);
}

export type ServiceBucket = 'active' | 'pending' | 'completed';

/** Statuses that show a service as being worked on. 875920001 is not a named status but is sent by the server. */
const ACTIVE_BUCKET: ReadonlySet<number> = new Set([
  SERVICE_STATUS.IN_UITVOERING,
  875920001,
  SERVICE_STATUS.HULPVERLENING_AKKOORD,
]);

/** Which list a service is shown in. Everything unknown counts as pending. */
export function getServiceBucket(statuscode: number): ServiceBucket {
  if (statuscode === SERVICE_STATUS.HULPVERLENING_AFGEROND) {
    return 'completed';
  }
  return ACTIVE_BUCKET.has(statuscode) ? 'active' : 'pending';
}

/**
 * Whether there is still work to do for a service. Deliberately generous for statuses we do
 * not know: hiding a service the berger still has to handle is worse than showing one too many.
 */
export function isServiceOpenForWork(statuscode: number | undefined): boolean {
  if (statuscode === undefined) {
    return false;
  }
  if (NAME_BY_CODE.has(statuscode) && !SUBMIT_ALLOWED.has(statuscode)) {
    return false;
  }
  if (statuscode === SERVICE_STATUS.LAATSTE_BERICHT) {
    return false;
  }
  return getServiceBucket(statuscode) !== 'completed';
}

export type HasStatus = { readonly statuscode: number };

export function hasOpenServices(services: readonly HasStatus[] | null | undefined): boolean {
  return (services ?? []).some((service) => isServiceOpenForWork(service.statuscode));
}

/**
 * Narrower than `hasOpenServices`: only services actually being worked on right now (the
 * `active` bucket), not ones merely waiting. Declining an allocation is blocked on this —
 * finishing the ride you are on takes priority over declining the rest of the incident.
 */
export function hasActiveServices(services: readonly HasStatus[] | null | undefined): boolean {
  return (services ?? []).some((service) => getServiceBucket(service.statuscode) === 'active');
}

export type ServicePhase = 'accept' | 'loading' | 'delivery' | 'completed';

/** The step of the service flow the berger is in. Null when no flow step applies. */
export function getServicePhase(statuscode: number): ServicePhase | null {
  switch (statuscode) {
    case SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP:
      return 'accept';
    case SERVICE_STATUS.NOG_AANSTUREN:
    case SERVICE_STATUS.IN_UITVOERING:
      return 'loading';
    case SERVICE_STATUS.HULPVERLENING_AKKOORD:
      return 'delivery';
    case SERVICE_STATUS.LAATSTE_BERICHT:
      return 'completed';
    default:
      return null;
  }
}
