/**
 * The kind of allocation, as the CRM `dn_servicetypecode` of its first service. The keys are
 * translation keys (`allocationType.<key>`); the domain holds no display text.
 */
export const ALLOCATION_TYPE_KEYS = {
  1001: 'abandonedVehicle',
  1002: 'assistance',
  1003: 'taxAuthority',
  1004: 'salvage',
  1005: 'directTransport',
  1006: 'incidentManagement',
  1007: 'breakdownAssistance',
  1008: 'policeTow',
  1009: 'towAwayRegulation',
  1010: 'heavySalvage',
  1011: 'evacuation',
  1012: 'plannedTransport',
  1013: 'trajectory',
  1014: 'insuranceService',
  1017: 'truckSalvage',
  1030: 'plannedTransportThirdParty',
  9000: 'vehicleRelease',
} as const;

export type AllocationTypeKey = (typeof ALLOCATION_TYPE_KEYS)[keyof typeof ALLOCATION_TYPE_KEYS];

export function getAllocationTypeKey(
  code: number | null | undefined,
): AllocationTypeKey | 'unknown' {
  if (code === null || code === undefined) {
    return 'unknown';
  }
  return (
    (ALLOCATION_TYPE_KEYS as Readonly<Record<number, AllocationTypeKey | undefined>>)[code] ??
    'unknown'
  );
}
