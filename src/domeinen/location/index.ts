export { distanceInMeters, toCoordinate, type Coordinate } from './domain/geo';
export {
  addressLines,
  parseConcatenatedAddress,
  type AddressSource,
  type ParsedAddress,
} from './domain/address';
export {
  decideProximity,
  PROXIMITY_THRESHOLD_METERS,
  resolveCurrentPosition,
  type ConfirmReason,
  type CurrentLocation,
  type ProximityDecision,
} from './domain/proximity';
export {
  ACCEPT_LOCATION_MAX_AGE_MS,
  ACCEPT_LOCATION_REQUIRED_ACCURACY_METERS,
  ACCEPT_LOCATION_WAIT_TIMEOUT_MS,
  resolveFreshSample,
  type FreshSampleOptions,
  type LocationSample,
} from './domain/fresh-sample';
export {
  GPS_STATUS,
  gpsButtonVariant,
  resolveGpsStatus,
  type GpsStatus,
} from './domain/gps-status';
export { googleMapsSearchUrl } from './domain/maps-url';
export {
  LOCATION_ACCURACY,
  type GetCurrentLocationOptions,
  type LocationAccuracy,
} from './domain/location-accuracy';
export type { LocationReader } from './service/location-reader';
