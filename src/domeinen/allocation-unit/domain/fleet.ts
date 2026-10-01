/**
 * The company's own trucks and trailers, for internal bergers to pick from. The list itself comes
 * from the generic reference-data sync (entity name `dn_fleets` — see `service/allocation-unit-service.ts`),
 * not from a dedicated fleet endpoint: that is how the old app's `SelecteerTruck`/`SelecteerTrailer`
 * read it too.
 */

/** CRM vehicle-type codes, ported from the old app's `constants/index.ts`. */
export const VEHICLE_TYPE_CODE_TRUCK = 1001;
export const VEHICLE_TYPE_CODE_TRAILER = 1002;

export type FleetVehicle = {
  id: string;
  name: string;
  vehicleNumber: string | null;
  typeCode: number;
};

export function filterFleetByType(
  fleet: readonly FleetVehicle[],
  typeCode: number,
): FleetVehicle[] {
  return fleet.filter((vehicle) => vehicle.typeCode === typeCode);
}

/** Case-insensitive match on name or vehicle number; an empty query matches everything. */
export function searchFleet(fleet: readonly FleetVehicle[], query: string): FleetVehicle[] {
  const needle = query.trim().toUpperCase();
  if (needle === '') {
    return [...fleet];
  }
  return fleet.filter(
    (vehicle) =>
      vehicle.name.toUpperCase().includes(needle) ||
      (vehicle.vehicleNumber?.toUpperCase().includes(needle) ?? false),
  );
}
