import * as Location from 'expo-location';
import type { Logger } from '@/shared/logging/logger';
import { LOCATION_ACCURACY, type LocationAccuracy } from '../../domain/location-accuracy';
import type { CurrentLocation } from '../../domain/proximity';
import type { LocationReader } from '../../service/location-reader';

const toExpoAccuracy = (accuracy: LocationAccuracy): Location.LocationAccuracy =>
  accuracy === LOCATION_ACCURACY.coarse ? Location.Accuracy.Low : Location.Accuracy.High;

/**
 * Foreground-only, point-in-time reads — no continuous tracking, no background mode. Asks the
 * system dialog only while the permission is still undetermined; a later denial is
 * `{ isValid: false }` and the settings screen can reopen the system settings.
 * Fine accuracy keeps the 500 m accept boundary meaningful; coarse (~1 km) is for fast sorts.
 */
export function createExpoLocationReader(logger?: Logger): LocationReader {
  return {
    async getCurrent(options): Promise<CurrentLocation> {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'undetermined') {
          ({ status } = await Location.requestForegroundPermissionsAsync());
        }
        if (status !== 'granted') {
          return { isValid: false };
        }
        const accuracy = options?.accuracy ?? LOCATION_ACCURACY.fine;
        const position = await Location.getCurrentPositionAsync({
          accuracy: toExpoAccuracy(accuracy),
        });
        return {
          isValid: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (error) {
        logger?.warn('app', 'Could not read the current location', { error });
        return { isValid: false };
      }
    },
  };
}
