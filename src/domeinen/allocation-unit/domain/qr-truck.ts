import type { FleetVehicle } from './fleet';
import { normalizeLicensePlate } from './license-plate';

/** Finds an internal truck whose licence plate or fleet number matches the QR payload. */
export function findTruckByQrCode(
  trucks: readonly FleetVehicle[],
  value: string,
): FleetVehicle | null {
  const scannedValue = normalizeLicensePlate(value);
  if (scannedValue === '') {
    return null;
  }

  return (
    trucks.find(
      (truck) =>
        normalizeLicensePlate(truck.name) === scannedValue ||
        (truck.vehicleNumber !== null &&
          normalizeLicensePlate(truck.vehicleNumber) === scannedValue),
    ) ?? null
  );
}
