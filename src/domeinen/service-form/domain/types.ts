/**
 * The shapes behind the schema-driven service form. Ported from `vaneijck-salvageapp`'s
 * `Servicesform` pilot (`src/domains/services/types/serviceForm.types.ts`), which itself replaces
 * the old `ProcessingService.js` (docs/legacy.md) — that class component read the exact same
 * `dataDefinition` JSON by scanning synced reference data for it; this only changes where the JSON
 * comes from (`reference-data`), never its shape. No fixed entity name — new sync entities must work
 * without an app update.
 */

import type { RdwInfo } from '@/domeinen/rdw';

export type ServiceFormLanguageCode = 1043 | 1044;

export type LocalizedServiceFormValue = {
  'language-code': number;
  value: string;
};

export type ServiceFormCondition = {
  property: string;
  value: boolean | string | number | Array<string | number>;
};

export type ServiceFormRequiredWhen = {
  field: string;
  value: boolean | string | number;
};

export type RawServiceFormValidation = {
  validation_type?: string;
  value?: unknown;
  [key: string]: unknown;
};

export type ServiceFormSortOptions = {
  orderby?: string;
  direction?: 'ascending' | 'descending' | string;
};

export type ServiceFormDependencies = {
  required?: string;
  value?: unknown;
};

export type RawServiceFormAutoform = {
  value?: string;
  readonly?: boolean;
  optional?: boolean;
  autocomplete?: boolean;
  requiredwhen?: ServiceFormRequiredWhen;
  validations?: RawServiceFormValidation[];
  copyfrom?: string[];
  [key: string]: unknown;
};

export type ServiceFormSignatureSubFieldAutoform = {
  copyfrom?: string[];
  [key: string]: unknown;
};

export type ServiceFormSignatureSubField = {
  label?: LocalizedServiceFormValue[];
  autoform?: ServiceFormSignatureSubFieldAutoform;
  [key: string]: unknown;
};

export type ServiceFormTransportConditions = {
  label?: LocalizedServiceFormValue[];
  url?: string;
  [key: string]: unknown;
};

export type ServiceFormSignatureSubFields = {
  name?: ServiceFormSignatureSubField;
  email?: ServiceFormSignatureSubField;
  transportConditions?: ServiceFormTransportConditions;
};

export type RawServiceFormField = {
  name?: string;
  label?: LocalizedServiceFormValue[];
  type?: string;
  table?: string;
  autoform?: RawServiceFormAutoform;
  requiredvisibility?: ServiceFormCondition;
  sortoptions?: ServiceFormSortOptions;
  dependencies?: ServiceFormDependencies;
  subFields?: ServiceFormSignatureSubFields;
  [key: string]: unknown;
};

export type RawServiceFormSection = {
  header?: LocalizedServiceFormValue[];
  fields?: RawServiceFormField[];
  contractRights?: unknown[];
  [key: string]: unknown;
};

export type RawServiceFormPhase = {
  phase?: number;
  'phase-name'?: LocalizedServiceFormValue[];
  photosMandatory?: string[];
  tabs?: RawServiceFormSection[];
  [key: string]: unknown;
};

export type RawServiceFormDefinition = {
  servicecode?: number;
  servicename?: LocalizedServiceFormValue[];
  definition?: RawServiceFormPhase[];
  [key: string]: unknown;
};

export type ServiceFormDiagnosticCode =
  | 'condition-cycle'
  | 'invalid-field'
  | 'missing-condition-controller'
  | 'missing-early-completion-field'
  | 'missing-phase'
  | 'missing-service';

export type ServiceFormDiagnostic = {
  code: ServiceFormDiagnosticCode;
  message: string;
  fieldId?: string;
  fieldKey?: string;
};

export type ServiceFormField = {
  id: string;
  key: string;
  label: string;
  type: string;
  table?: string;
  readOnly: boolean;
  optional: boolean;
  autocomplete: boolean;
  autoformValue?: string;
  sortOptions?: ServiceFormSortOptions;
  dependencies?: ServiceFormDependencies;
  requiredVisibility?: ServiceFormCondition;
  requiredWhen?: ServiceFormRequiredWhen;
  validations: RawServiceFormValidation[];
  raw: RawServiceFormField;
};

export type ServiceFormSection = {
  id: string;
  title: string;
  fields: ServiceFormField[];
  contractRights: unknown[];
};

export type NormalizedServiceForm = {
  serviceCode: number;
  serviceName: string;
  phase: number;
  phaseName: string;
  photosMandatory: string[];
  sections: ServiceFormSection[];
  diagnostics: ServiceFormDiagnostic[];
  requiresTermsAcceptance: boolean;
};

export type ServiceFormAnswer = {
  value: unknown;
  displayValue: unknown;
  table?: string;
  email?: string;
  signatureName?: string;
};

export type ServiceFormAnswers = Record<string, ServiceFormAnswer>;

export type ServiceFormRequiredOverrides = Record<string, true>;

export type NormalizeServiceFormOptions = {
  phase?: number;
  languageCode: number;
  values?: Record<string, unknown>;
  pleaseSelectLabel?: string;
};

export type NormalizedServiceFormResult = {
  form: NormalizedServiceForm;
  initialAnswers: ServiceFormAnswers;
};

export type ServiceFormErrorCode =
  | 'max-length'
  | 'max-value'
  | 'min-value'
  | 'required'
  | 'signature-email-required'
  | 'signature-name-required';

export type ServiceFormError = {
  code: ServiceFormErrorCode;
  /** Dutch fallback text; the screen translates by `code` and `limit`. */
  message: string;
  /** The configured bound for `max-length`, `max-value` and `min-value`. */
  limit?: number;
};

export type ServiceFormErrors = Record<string, ServiceFormError>;

export type ServiceFormCapabilityResult = ServiceFormAnswer | null | undefined;

/**
 * External integrations the renderer needs but never calls directly (RDW lookup, address search,
 * phone, photo and signature capture) — injected so the pure engine and the components stay free
 * of any concrete implementation. Not wired to a device yet; see `docs/decisions` for the slice
 * that connects each one.
 */
export type ServiceFormCapabilities = {
  fetchRdwInfo?: (registrationNumber: string) => Promise<RdwInfo | null>;
  selectOption?: (
    field: ServiceFormField,
    answer: ServiceFormAnswer,
    dependencyAnswer?: ServiceFormAnswer,
  ) => Promise<ServiceFormCapabilityResult> | ServiceFormCapabilityResult;
  searchAddress?: (
    field: ServiceFormField,
    answer: ServiceFormAnswer,
  ) => Promise<ServiceFormCapabilityResult> | ServiceFormCapabilityResult;
  callPhone?: (phoneNumber: string) => Promise<void> | void;
  capturePhoto?: (
    field: ServiceFormField,
  ) => Promise<ServiceFormCapabilityResult> | ServiceFormCapabilityResult;
  captureSignature?: (
    field: ServiceFormField,
    answer: ServiceFormAnswer,
  ) => Promise<ServiceFormCapabilityResult> | ServiceFormCapabilityResult;
};
