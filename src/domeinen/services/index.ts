export { getEarlyCompleteFlags, hasEarlyCompleteTerminal } from './domain/early-complete';
export type { EarlyCompleteFlags, EarlyCompleteKey } from './domain/early-complete';
export { getExitTarget } from './domain/exit-target';
export type { ExitTarget, ExitTargetInput } from './domain/exit-target';
export {
  buildPltrCards,
  externalMapLinks,
  pltrPartyLabel,
  pltrPrimaryAction,
  pltrVehicle,
  PLTR_ACTION,
  PLTR_PHASE,
} from './domain/pltr';
export type { ExternalMapLinks, PltrAction, PltrCard, PltrPhase, PltrVehicle } from './domain/pltr';
export { resolveProcessingExit } from './domain/processing-exit';
export type {
  ProcessingExitInput,
  ProcessingExitKind,
  ProcessingExitResult,
} from './domain/processing-exit';
export { EARLY_COMPLETE_FIELDS, isPltrType, SERVICE_TYPE } from './domain/service-types';
export { getServiceContact, getServiceParty, getServiceVehicle } from './domain/service-summary';
export type {
  ServiceContact,
  ServiceSummarySource,
  VehicleSummary,
} from './domain/service-summary';
export {
  getServiceBucket,
  getServicePhase,
  getServiceStatusName,
  hasActiveServices,
  hasOpenServices,
  isServiceOpenForWork,
  isSubmitAllowed,
  SERVICE_STATUS,
} from './domain/status';
export type { HasStatus, ServiceBucket, ServicePhase, ServiceStatusName } from './domain/status';
export { checkAcceptLocation, getTargetLocation } from './domain/target-location';
export type { TargetKind, TargetLocation, TargetSource } from './domain/target-location';
