export {
  applyLicensePlateInput,
  canBeDutchLicensePlate,
  displayVehicleRegistration,
  formatLicensePlate,
  isDutchLicensePlate,
  normalizeLicensePlate,
} from './domain/license-plate';
export type { LicensePlateInput, VehicleRegistrationDisplay } from './domain/license-plate';
export {
  applyCalendarDate,
  applyPickerValue,
  applyTimeOfDay,
  formatDateForDisplay,
  formatDateInputForDisplay,
  formatTimeForDisplay,
  formatTimeInputForDisplay,
  getDefaultEndDate,
  getDurationFromNow,
  getRelativeEndDate,
  isBeyond24Hours,
  isInPast,
  parseDateInput,
  parseTimeInput,
  validateEndDate,
} from './domain/working-hours';
export type { EndDateValidation, EndDateValidationError, ParsedDate } from './domain/working-hours';
export { createEndDatePreference, REMEMBERED_END_DATE_KEY } from './service/end-date-preference';
export type { EndDatePreference } from './service/end-date-preference';
export {
  createRecentTruckPreference,
  RECENT_TRUCK_IDS_KEY,
} from './service/recent-truck-preference';
export type { RecentTruckPreference } from './service/recent-truck-preference';
export { createHomebasePreference, REMEMBERED_HOMEBASE_KEY } from './service/homebase-preference';
export type { HomebasePreference } from './service/homebase-preference';
export { createLastUnitPreference, LAST_UNIT_SNAPSHOT_KEY } from './service/last-unit-preference';
export type { LastUnitPreference } from './service/last-unit-preference';
export {
  matchLastUnitSnapshot,
  parseLastUnitSnapshot,
  toUnitReuseIntent,
} from './domain/last-unit-snapshot';
export type { LastUnitSnapshot, UnitReuseIntent } from './domain/last-unit-snapshot';
export {
  formatHomebaseAddress,
  normalizeHomebaseCoordinate,
  pickInitialHomebase,
  searchHomebaseLocations,
  sortHomebaseLocations,
} from './domain/homebase';
export type { HomebaseLocation, SortedHomebaseLocation } from './domain/homebase';
export { AVAILABILITY_OPTIONS, DEFAULT_AVAILABILITY } from './domain/availability';
export type { UnitAvailability } from './domain/availability';
export {
  filterFleetByType,
  searchFleet,
  VEHICLE_TYPE_CODE_TRAILER,
  VEHICLE_TYPE_CODE_TRUCK,
} from './domain/fleet';
export type { FleetVehicle } from './domain/fleet';
export { decideReregister } from './domain/reregister';
export type {
  CurrentUnitForReregister,
  ReregisterOutcome,
  ReregisterReason,
} from './domain/reregister';
export { decideChangeVehicle } from './domain/change-vehicle';
export type { ChangeVehicleDecision } from './domain/change-vehicle';
export { DISPATCH_PHONE_NUMBER, dispatchPhoneUrl } from './domain/dispatch';
export { createAllocationUnitApi } from './api/allocation-unit-api';
export type {
  AllocationUnitApi,
  AllocationUnitInfo,
  ExternalUnitInput,
  InternalUnitInput,
} from './api/allocation-unit-api';
export { parseFleetRows, parseHomebaseLocationRows } from './api/schemas';
export type { ParsedFleet, ParsedHomebaseLocations, RejectedRow } from './api/schemas';
export {
  classifyRegistrationError,
  createAllocationUnitService,
  HOMEBASE_ENTITY_NAME,
} from './service/allocation-unit-service';
export type {
  AllocationUnitService,
  CancelUnitFailure,
  ExtendShiftFailure,
  RegisterExternalInput,
  RegisterInternalInput,
  RegisterUnitFailure,
} from './service/allocation-unit-service';
