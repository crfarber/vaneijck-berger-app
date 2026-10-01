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
  GPS_STATUS,
  gpsButtonVariant,
  resolveGpsStatus,
  type GpsStatus,
} from './domain/gps-status';
export { googleMapsSearchUrl } from './domain/maps-url';
export type { LocationReader } from './service/location-reader';
