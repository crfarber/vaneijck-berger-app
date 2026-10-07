import {
  formatLicensePlate,
  isDutchLicensePlate,
  normalizeLicensePlate,
} from '@/domeinen/allocation-unit';
import type { RdwApi, RdwInfo } from '@/domeinen/rdw';
import type { Logger } from '@/shared/logging/logger';
import type { Service } from '../domain/types';

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function addAvailableRdwFields(service: Service, info: RdwInfo): Service {
  const brand = hasText(info.model) ? info.model.trim() : undefined;
  const tradeName = hasText(info.tradeName) ? info.tradeName.trim() : undefined;
  const color = hasText(info.primaryColor) ? info.primaryColor.trim() : undefined;
  const vehicleInfo = service.dn_vwe_vehicleinformationid;

  return {
    ...service,
    ...(!hasText(service.dn_vehiclebrand) && brand ? { dn_vehiclebrand: brand } : {}),
    ...(!hasText(service.dn_vehicletradename) && tradeName
      ? { dn_vehicletradename: tradeName }
      : {}),
    ...(!hasText(vehicleInfo?.vwe_rdw_kleur1) && color
      ? {
          dn_vwe_vehicleinformationid: {
            ...(vehicleInfo ?? {}),
            vwe_rdw_kleur1: color,
          },
        }
      : {}),
  };
}

/** Fills missing vehicle display fields without allowing RDW to block the services list. */
export async function enrichServicesWithRdw(
  services: readonly Service[],
  rdwApi: Pick<RdwApi, 'lookupByRegistrationNumber'>,
  logger?: Logger,
): Promise<Service[]> {
  const lookupByPlate = new Map<string, Promise<RdwInfo | null>>();

  return Promise.all(
    services.map(async (service) => {
      if (hasText(service.dn_vehiclebrand)) {
        return service;
      }

      const plate = service.dn_concatlicenseplate;
      if (!hasText(plate) || !isDutchLicensePlate(plate)) {
        return service;
      }

      const normalizedPlate = normalizeLicensePlate(plate);
      if (normalizedPlate.length !== 6) {
        return service;
      }

      let lookup = lookupByPlate.get(normalizedPlate);
      if (!lookup) {
        lookup = rdwApi
          .lookupByRegistrationNumber(formatLicensePlate(plate))
          .catch((error: unknown) => {
            logger?.warn('sync', 'RDW vehicle lookup failed', {
              ...(service.dn_serviceid ? { serviceId: service.dn_serviceid } : {}),
              error,
            });
            return null;
          });
        lookupByPlate.set(normalizedPlate, lookup);
      }

      const info = await lookup;
      return info ? addAvailableRdwFields(service, info) : service;
    }),
  );
}
