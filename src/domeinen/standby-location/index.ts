export { formatStandbyAddressShort } from './domain/address';
export { isWithinStandbyDistance } from './domain/arrival';
export { hasBlockingAllocationItems } from './domain/blocking';
export { parseStandbyLocationAdvice } from './domain/parse';
export { hasShiftEnded } from './domain/shift';
export { applyAdvice, clearAdvice, emptyStandbyState, expireAdvice } from './domain/state';
export { isStandbyBannerVisible } from './domain/visibility';
export type {
  StandbyAdviceStatus,
  StandbyLocationAdvice,
  StandbyLocationAdviceFields,
  StandbyLocationState,
} from './domain/types';
export {
  createStandbyLocationService,
  STANDBY_LOCATION_STORAGE_KEY,
} from './service/standby-location-service';
export type {
  StandbyLocationService,
  StandbyLocationServiceDeps,
} from './service/standby-location-service';
