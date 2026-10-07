export { createServiceFormApi } from './api/service-form-api';
export type { ServiceFormApi } from './api/service-form-api';
export { answersAfterParentChange } from './domain/answer-updates';
export {
  applyRdwVehicleAutofill,
  clearRdwAutofillAnswers,
  getVehicleSectionFieldOrder,
  isRdwPlateField,
  isVehicleRegistrationField,
  partitionVehicleRegistrationFields,
  RDW_AUTOFILL_FIELD_NAMES,
  RDW_READONLY_FIELD_NAMES,
  VEHICLE_FIELD_NAMES,
} from './domain/rdw-autofill';
export type { VehicleFieldName } from './domain/rdw-autofill';
export {
  buildAddressPlaceAnswers,
  readAddressComponentMapping,
  resolveCountryAnswer,
} from './domain/address-place-selection';
export type { AddressComponentMapping, CountryLookupRow } from './domain/address-place-selection';
export {
  normalizeDutchPostalCode,
  parsePostalAddressLookupResponse,
} from './domain/postal-address-lookup';
export { evaluateServiceFormVisibility, isServiceFormConditionMet } from './domain/conditions';
export { createServiceFormScenario } from './domain/scenario-export';
export {
  FIELD_KIND,
  groupSectionFields,
  normalizeFieldInput,
  resolveFieldKind,
} from './domain/field-kind';
export type { FieldGroup, FieldKind } from './domain/field-kind';
export {
  isLastServiceFormPhase,
  phaseNumbersFromDefinition,
  SERVICE_FORM_PHASE,
  serviceFormLanguageCode,
  serviceFormPhaseForStatus,
} from './domain/form-context';
export type { ServiceFormPhase } from './domain/form-context';
export {
  booleanSelectState,
  buildBooleanSelectAnswer,
  buildSelectOptions,
  filterSelectOptions,
  selectedOptionAnswer,
} from './domain/select-options';
export type { OptionRow, SelectOption, SelectOptionsResult } from './domain/select-options';
export type { ServiceFormVisibility } from './domain/conditions';
export {
  findServiceFormDefinition,
  normalizeServiceFormDefinition,
  unwrapServiceFormDefinitions,
} from './domain/schema';
export {
  selectActiveServiceFormAnswers,
  selectNextIncompleteServiceFormField,
  selectQuickViewFields,
  selectRequiredServiceFormFields,
  selectServiceFormProgress,
  selectVisibleServiceFormSections,
  isServiceFormDirty,
} from './domain/selectors';
export type {
  QuickViewContext,
  ServiceFormProgress,
  ServiceFormValidationContext,
} from './domain/selectors';
export {
  buildUploadSignatureParams,
  getActiveSignatureKey,
  getPhaseLabel,
  SIGNATURE_PHASE_LABELS,
  SIGNATURE_TYPE_LABELS,
} from './domain/signature-upload';
export type { SignaturePhaseLabel, UploadSignatureParams } from './domain/signature-upload';
export { needsPhotoConfirmation } from './domain/photos-confirm';
export { hasAnySignature, isSignatureKey, SIGNATURE_KEYS } from './domain/signature';
export type { SignatureDataInput, SignatureKey } from './domain/signature';
export {
  buildServicePostBody,
  buildSignaturePostData,
  coerceBooleanSelectSubmissionValue,
  coerceFieldValue,
  isAnswerEmpty,
  resolveSignatureAbsentFlags,
  resolveStatusFields,
} from './domain/submission';
export type { ServiceFormSubmissionOptions } from './domain/submission';
export type {
  LocalizedServiceFormValue,
  NormalizedServiceForm,
  NormalizedServiceFormResult,
  NormalizeServiceFormOptions,
  RawServiceFormDefinition,
  PostalAddressLookupInput,
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormCapabilities,
  ServiceFormCondition,
  ServiceFormDiagnostic,
  ServiceFormError,
  ServiceFormErrors,
  ServiceFormField,
  ServiceFormRequiredOverrides,
  ServiceFormSection,
} from './domain/types';
export {
  buildEmptyServiceFormAnswer,
  buildInitialServiceFormAnswer,
  buildInitialServiceFormAnswers,
  cloneServiceFormAnswer,
  cloneServiceFormAnswers,
  resolveServiceFormValueToShow,
} from './domain/values';
export {
  isServiceFormAnswerEmpty,
  isServiceFormFieldFilled,
  isServiceFormFieldRequired,
  isSignatureSkippable,
  validateServiceFormField,
  validateVisibleServiceForm,
} from './domain/validation';
export {
  createServiceFormDraftStore,
  hasServiceFormDraftProgress,
  parseServiceFormDraft,
} from './service/draft-storage';
export type { ServiceFormDraft, ServiceFormDraftStore } from './service/draft-storage';
export { createServiceFormService } from './service/service-form-service';
export type {
  SelectOptionsRequest,
  ServiceFormService,
  SubmitServiceFormInput,
  SubmitServiceFormResult,
} from './service/service-form-service';
export { createServiceFormStore } from './store/create-service-form-store';
export type { ServiceFormState, ServiceFormStore } from './store/create-service-form-store';
