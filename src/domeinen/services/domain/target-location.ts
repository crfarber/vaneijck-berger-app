import {
  decideProximity,
  resolveCurrentPosition,
  toCoordinate,
  type Coordinate,
  type CurrentLocation,
  type ProximityDecision,
} from '@/domeinen/location';
import { isPltrType } from './service-types';
import { SERVICE_STATUS } from './status';

export type TargetKind = 'delivery' | 'load' | 'incident';

export type TargetLocation = { kind: TargetKind; coordinate: Coordinate };

/** The fields of an incident and a service that say where the berger has to be. */
export type TargetSource = {
  incident?: { dn_latitude?: unknown; dn_longtitude?: unknown } | null;
  service?: {
    dn_loadlatitude?: unknown;
    dn_loadlongitude?: unknown;
    dn_deliverylatitude?: unknown;
    dn_deliverylongitude?: unknown;
    dn_servicetypecode?: unknown;
    statuscode?: unknown;
  } | null;
};

/**
 * Where the berger has to be for this service:
 * 1. PLTR in its delivery phase: the delivery location; otherwise its load location.
 * 2. Any service with a delivery location: that location.
 * 3. Otherwise the location of the incident.
 * A location counts only when both coordinates are usable.
 */
export function getTargetLocation({ incident, service }: TargetSource): TargetLocation | null {
  const load = toCoordinate(service?.dn_loadlatitude, service?.dn_loadlongitude);
  const delivery = toCoordinate(service?.dn_deliverylatitude, service?.dn_deliverylongitude);
  const incidentLocation = toCoordinate(incident?.dn_latitude, incident?.dn_longtitude);

  const typeCode = service?.dn_servicetypecode;
  if (typeof typeCode === 'number' && isPltrType(typeCode)) {
    if (service?.statuscode === SERVICE_STATUS.HULPVERLENING_AKKOORD && delivery) {
      return { kind: 'delivery', coordinate: delivery };
    }
    if (load) {
      return { kind: 'load', coordinate: load };
    }
  }
  if (delivery) {
    return { kind: 'delivery', coordinate: delivery };
  }
  if (incidentLocation) {
    return { kind: 'incident', coordinate: incidentLocation };
  }
  return null;
}

/**
 * Whether accepting the service needs a confirmation because the berger is not near enough.
 * Without an incident or a service there is nothing to compare against: no confirmation.
 */
export function checkAcceptLocation(
  source: TargetSource,
  current: CurrentLocation,
): ProximityDecision {
  if (!source.incident || !source.service) {
    return { action: 'proceed' };
  }
  const target = getTargetLocation(source);
  return decideProximity(resolveCurrentPosition(current), target?.coordinate ?? null);
}
