import { toCoordinate, type Coordinate } from '@/domeinen/location';
import { getServiceParty, isPltrType, SERVICE_STATUS } from '@/domeinen/services';
import { getAllocationTypeKey, type AllocationTypeKey } from './type';
import type { Incident, Service } from './types';

export type ServiceCardVehicle = {
  plate?: string;
  brand?: string;
  tradeName?: string;
  color?: string;
};

export type ServiceCardModel = {
  kind: 'standard' | 'pltr';
  typeKey: AllocationTypeKey | 'unknown';
  number?: string;
  party?: string;
  driverName?: string;
  phone?: string;
  vehicle: ServiceCardVehicle;
  coordinate?: Coordinate;
};

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function vehicleFrom(service: Service): ServiceCardVehicle {
  const plate = text(service.dn_concatlicenseplate)?.toUpperCase();
  const brand = text(service.dn_vehiclebrand)?.toUpperCase();
  const tradeName = text(service.dn_vehicletradename)?.toUpperCase();
  const vehicleInfo = service.dn_vwe_vehicleinformationid;
  const color =
    vehicleInfo && typeof vehicleInfo === 'object'
      ? text(vehicleInfo.vwe_rdw_kleur1)?.toUpperCase()
      : undefined;
  return {
    ...(plate ? { plate } : {}),
    ...(brand ? { brand } : {}),
    ...(tradeName ? { tradeName } : {}),
    ...(color ? { color } : {}),
  };
}

/**
 * Load coordinates while the service is not yet in delivery; delivery coordinates once it is
 * (`HULPVERLENING_AKKOORD` = old `Aflevering`). Falls back to the incident position.
 */
function navigateCoordinate(service: Service, incident?: Incident): Coordinate | null {
  if (service.statuscode === SERVICE_STATUS.HULPVERLENING_AKKOORD) {
    return toCoordinate(service.dn_deliverylatitude, service.dn_deliverylongitude);
  }
  return (
    toCoordinate(service.dn_loadinglocationlatitude, service.dn_loadinglocationlongitude) ??
    toCoordinate(service.dn_loadlatitude, service.dn_loadlongitude) ??
    toCoordinate(incident?.dn_latitude, incident?.dn_longtitude)
  );
}

/** Keeps service-type decisions and CRM field access out of card components. */
export function resolveServiceCardModel(service: Service, incident?: Incident): ServiceCardModel {
  const party = getServiceParty(service);
  const driverName = text(service.dn_driverfullname);
  const phone = text(service.dn_drivertelephonenumber1);
  const coordinate = navigateCoordinate(service, incident);
  return {
    kind: isPltrType(service.dn_servicetypecode) ? 'pltr' : 'standard',
    typeKey: getAllocationTypeKey(service.dn_servicetypecode),
    ...(text(service.dn_servicenumber) ? { number: text(service.dn_servicenumber) } : {}),
    ...(party ? { party } : {}),
    ...(driverName ? { driverName } : {}),
    ...(phone ? { phone } : {}),
    vehicle: vehicleFrom(service),
    ...(coordinate ? { coordinate } : {}),
  };
}
