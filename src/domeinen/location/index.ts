export { distanceInMeters, toCoordinate, type Coordinate } from './domain/geo';
export {
  cameraForFocus,
  cameraForPoints,
  NETHERLANDS_CENTER,
  type MapCameraPosition,
} from './domain/map-camera';
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
  DEFAULT_SELF_TAP_THRESHOLD_METERS,
  isSelfMapTap,
  selfTapThresholdMeters,
} from './domain/map-self-tap';
export {
  LOCATION_ACCURACY,
  type GetCurrentLocationOptions,
  type LocationAccuracy,
} from './domain/location-accuracy';
export { resolveCoarseWatchReuse } from './domain/coarse-watch-reuse';
export type { LocationReader } from './service/location-reader';
