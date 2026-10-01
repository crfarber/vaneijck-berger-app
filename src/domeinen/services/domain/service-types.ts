/** CRM `dn_servicetypecode` values the app has rules for. */
export const SERVICE_TYPE = {
  ASSISTANCE: 1002,
  BERGING: 1004,
  PECHHULP: 1007,
  PLANNED_TRANSPORT: 1012,
  /** Planned transport for a third party ("Planbaar transport van Ven"). The old app labelled it "toch een PLTR". */
  PLANNED_TRANSPORT_THIRD_PARTY: 1030,
  /** Not a CRM service type: vehicle release ("Afgifte"), used by the app as a pseudo type. */
  AFGIFTE: 9000,
} as const;

const PLTR_TYPES: ReadonlySet<number> = new Set([
  SERVICE_TYPE.PLANNED_TRANSPORT,
  SERVICE_TYPE.PLANNED_TRANSPORT_THIRD_PARTY,
]);

/** PLTR (planbaar transport) is a kind of incident with its own screens. */
export function isPltrType(typeCode: number | null | undefined): boolean {
  return typeCode !== null && typeCode !== undefined && PLTR_TYPES.has(typeCode);
}

/** Fields that decide whether a service ends after phase 1. */
export const EARLY_COMPLETE_FIELDS = {
  assistanceBreakdown: 'dn_assisistancetypeofbreakdowncode',
  pechhulpSettlement: 'dn_breakdownsettlementcode',
  bergingEkv: 'dn_ekv',
} as const;

/**
 * Pechhulp settlements that still need phase 2 (transport / storage). Any other filled
 * settlement, such as "repaired on the spot", closes the service after phase 1.
 */
export const PECHHULP_SETTLEMENTS_CONTINUING_TO_PHASE_2: readonly number[] = [1004, 1005];

/** `dn_imactionstatuscode` values that mark a service as LCMH. */
export const LCMH_IM_ACTION_STATUS_CODES: readonly number[] = [1002, 1005];
