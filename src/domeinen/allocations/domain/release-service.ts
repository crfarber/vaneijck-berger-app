import { SERVICE_STATUS, SERVICE_TYPE } from '@/domeinen/services';
import type { Service, VehicleReleaseAssignment, VehicleReleaseLocation } from './types';

/** Local draft / photo scope for a locatie-afgifte — one key per vehicle service. */
export function releaseScopeId(serviceId: string): string {
  return `release:${serviceId}`;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Turns a vehicle-release assignment into the `Service` shape the form expects.
 * Locatie-afgifte has no allocation service row; the assignment is the service. Missing
 * typecode becomes Afgifte (9000); missing status defaults to OPSLAG (legacy submit path).
 */
export function toReleaseService(assignment: VehicleReleaseAssignment): Service {
  return {
    ...assignment,
    dn_serviceid: assignment.dn_serviceid,
    dn_servicetypecode: readNumber(assignment.dn_servicetypecode) ?? SERVICE_TYPE.AFGIFTE,
    statuscode: readNumber(assignment.statuscode) ?? SERVICE_STATUS.OPSLAG,
    statecode: readNumber(assignment.statecode) ?? 0,
  };
}

export function findReleaseAssignment(
  locations: readonly VehicleReleaseLocation[],
  locationId: string,
  serviceId: string,
): VehicleReleaseAssignment | undefined {
  const location = locations.find((item) => item.dn_locationId === locationId);
  return location?.releases.find((item) => item.dn_serviceid === serviceId);
}
