import type { UnitAvailability } from './availability';
import { AVAILABILITY_OPTIONS } from './availability';
import type { FleetVehicle } from './fleet';

export type CurrentUnitOverviewInput = Partial<UnitAvailability> & {
  vehicleId?: string | null;
  trailerId?: string | null;
  alternateVehicleRegistrationNumber?: string | null;
  validUntil?: string | null;
};

export type CurrentUnitOverview = {
  vehicleName: string | null;
  vehicleNumber: string | null;
  trailerName: string | null;
  trailerNumber: string | null;
  validUntil: string | null;
  restrictions: (keyof UnitAvailability)[];
};

export function toCurrentUnitOverview(
  unit: CurrentUnitOverviewInput,
  fleet: readonly FleetVehicle[],
): CurrentUnitOverview {
  const vehicle = fleet.find((item) => item.id === unit.vehicleId);
  const trailer = fleet.find((item) => item.id === unit.trailerId);
  const externalRegistration = unit.alternateVehicleRegistrationNumber?.trim().toUpperCase();

  return {
    vehicleName: externalRegistration || vehicle?.name || null,
    vehicleNumber: vehicle?.vehicleNumber ?? null,
    trailerName: trailer?.name ?? null,
    trailerNumber: trailer?.vehicleNumber ?? null,
    validUntil: unit.validUntil ?? null,
    restrictions: AVAILABILITY_OPTIONS.filter((key) => unit[key] === true),
  };
}
