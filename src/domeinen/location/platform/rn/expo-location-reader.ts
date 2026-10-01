import * as Location from 'expo-location';
import type { Logger } from '@/shared/logging/logger';
import type { CurrentLocation } from '../../domain/proximity';
import type { LocationReader } from '../../service/location-reader';

/**
 * Foreground-only, point-in-time reads for the 500 m accept check — no continuous tracking, no
 * background mode. Asks the system dialog only while the permission is still undetermined; a
 * later denial is `{ isValid: false }` and the settings screen can reopen the system settings.
 * High accuracy keeps the 500 m boundary meaningful (fine GPS, not coarse network).
 */
export function createExpoLocationReader(logger?: Logger): LocationReader {
  return {
    async getCurrent(): Promise<CurrentLocation> {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'undetermined') {
          ({ status } = await Location.requestForegroundPermissionsAsync());
        }
        if (status !== 'granted') {
          return { isValid: false };
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
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
