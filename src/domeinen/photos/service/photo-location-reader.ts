import { resolveCurrentPosition, type LocationReader } from '@/domeinen/location';

const SIMULATOR_LOCATION = {
  isValid: true,
  latitude: 52.0803,
  longitude: 4.3244,
} as const;

export function createPhotoLocationReader(
  reader: LocationReader,
  useSimulatorFallback: boolean,
): LocationReader {
  return {
    start: () => reader.start(),
    stop: () => reader.stop(),
    async getCurrent(options) {
      const current = await reader.getCurrent(options);
      if (!useSimulatorFallback || resolveCurrentPosition(current) !== null) {
        return current;
      }
      return SIMULATOR_LOCATION;
    },
  };
}
