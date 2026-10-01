import {
  findNetherlandsCountry,
  matchVehicleBrand,
  matchVehicleType,
  type LookupRow,
  type RdwInfo,
} from '@/domeinen/rdw';
import type { ServiceFormAnswer, ServiceFormAnswers } from './types';

/** Field keys that belong to the vehicle-registration group (when present in the schema). */
export const VEHICLE_FIELD_NAMES = [
  '_dn_vehiclecountryoforiginid_value',
  'dn_vehicleregistrationoinitial',
  'dn_vehicleregistrationno',
  'dn_vehicleregistration',
  'dn_vehiclebrand',
  'dn_vehicletradename',
  'dn_vwe_vehicleinformationid.vwe_rdw_kleur1',
  '_dn_vehiclebrandid_value',
  '_dn_vehicletypeid_value',
] as const;

export type VehicleFieldName = (typeof VEHICLE_FIELD_NAMES)[number];

export const VEHICLE_FIELD_NAME_SET = new Set<string>(VEHICLE_FIELD_NAMES);

/** Selects that become runtime-required when RDW lookup fails. */
export const RDW_AUTOFILL_FIELD_NAMES = [
  '_dn_vehiclecountryoforiginid_value',
  '_dn_vehiclebrandid_value',
  '_dn_vehicletypeid_value',
] as const;

export const RDW_READONLY_FIELD_NAMES = [
  'dn_vehiclebrand',
  'dn_vehicletradename',
  'dn_vwe_vehicleinformationid.vwe_rdw_kleur1',
] as const;

export const RDW_READONLY_FIELD_NAME_SET = new Set<string>(RDW_READONLY_FIELD_NAMES);

export const MANUAL_VEHICLE_FIELD_NAMES = [
  '_dn_vehiclebrandid_value',
  '_dn_vehicletypeid_value',
] as const;

export const MANUAL_VEHICLE_FIELD_NAME_SET = new Set<string>(MANUAL_VEHICLE_FIELD_NAMES);

/** Trigger keys for the live plate that starts an RDW lookup. */
export const RDW_PLATE_FIELD_KEYS = ['dn_vehicleregistrationno', 'dn_vehicleregistration'] as const;

export const VEHICLE_SECTION_FIELD_ORDER: readonly string[] = [
  'dn_vehicleregistrationoinitial',
  'dn_vehicleregistrationno',
  'dn_vehicleregistration',
  '_dn_vehiclecountryoforiginid_value',
  ...RDW_READONLY_FIELD_NAMES,
  ...MANUAL_VEHICLE_FIELD_NAMES,
];

export type VehicleFieldOrderOptions = {
  rdwLookupFailed?: boolean;
  hideManualVehicleFields?: boolean;
};

export function isVehicleRegistrationField(key: string): boolean {
  return VEHICLE_FIELD_NAME_SET.has(key);
}

export function isRdwPlateField(key: string): boolean {
  return (RDW_PLATE_FIELD_KEYS as readonly string[]).includes(key);
}

export function getVehicleSectionFieldOrder(
  availableSubmitNames: Iterable<string>,
  options?: VehicleFieldOrderOptions,
): string[] {
  const available = new Set(availableSubmitNames);
  return VEHICLE_SECTION_FIELD_ORDER.filter((name) => {
    if (!available.has(name)) {
      return false;
    }
    if (options?.rdwLookupFailed && RDW_READONLY_FIELD_NAME_SET.has(name)) {
      return false;
    }
    if (
      options?.hideManualVehicleFields &&
      !options.rdwLookupFailed &&
      MANUAL_VEHICLE_FIELD_NAME_SET.has(name)
    ) {
      return false;
    }
    return true;
  });
}

function isSelectAnswerEmpty(
  answer: ServiceFormAnswer | undefined,
  pleaseSelectLabel: string,
): boolean {
  if (!answer) {
    return true;
  }
  const display = String(answer.displayValue ?? '').trim();
  if (display === '' || display === pleaseSelectLabel) {
    return true;
  }
  const value = answer.value;
  return value === '' || value === null || value === undefined;
}

function selectAnswer(displayName: string, valueData: string): ServiceFormAnswer {
  return { value: valueData, displayValue: displayName };
}

export type ApplyRdwAutofillParams = {
  rdwInfo: RdwInfo;
  answers: ServiceFormAnswers;
  /** Keys present in the current form section / group. */
  fieldKeys: ReadonlySet<string>;
  countries: readonly LookupRow[];
  vehicleBrands: readonly LookupRow[];
  vehicleTypes: readonly LookupRow[];
  pleaseSelectLabel: string;
  /** When true, overwrite country/brand/type even if already filled (plate changed). */
  overwriteRdwDerivedFields?: boolean;
};

/**
 * Builds answer patches for country / brand / type from an RDW hit. Only keys that exist in
 * `fieldKeys` are updated. Readonly RDW display (model/tradeName/color) is not stored here —
 * the vehicle group reads those from `rdwInfo` directly.
 */
export function applyRdwVehicleAutofill(params: ApplyRdwAutofillParams): ServiceFormAnswers {
  const updates: ServiceFormAnswers = {};
  const shouldFill = (key: string) =>
    params.fieldKeys.has(key) &&
    (params.overwriteRdwDerivedFields ||
      isSelectAnswerEmpty(params.answers[key], params.pleaseSelectLabel));

  if (shouldFill('_dn_vehiclecountryoforiginid_value')) {
    const country = findNetherlandsCountry(params.countries);
    if (country) {
      updates._dn_vehiclecountryoforiginid_value = selectAnswer(
        country.displayName,
        country.valueData,
      );
    }
  }

  let brandId: string | undefined;
  const existingBrand = params.answers._dn_vehiclebrandid_value;
  if (
    !shouldFill('_dn_vehiclebrandid_value') &&
    existingBrand?.value !== undefined &&
    existingBrand.value !== null &&
    existingBrand.value !== ''
  ) {
    brandId = String(existingBrand.value);
  }

  if (shouldFill('_dn_vehiclebrandid_value') && params.rdwInfo.model) {
    const brand = matchVehicleBrand(params.rdwInfo.model, params.vehicleBrands);
    if (brand) {
      updates._dn_vehiclebrandid_value = selectAnswer(brand.displayName, brand.valueData);
      brandId = brand.valueData;
    }
  } else if (brandId === undefined) {
    const fromUpdate = updates._dn_vehiclebrandid_value?.value;
    brandId = fromUpdate === undefined || fromUpdate === null ? undefined : String(fromUpdate);
  }

  if (brandId && shouldFill('_dn_vehicletypeid_value') && params.rdwInfo.tradeName) {
    const vehicleType = matchVehicleType(
      params.rdwInfo.tradeName,
      params.rdwInfo.model ?? '',
      params.vehicleTypes,
      brandId,
    );
    if (vehicleType) {
      updates._dn_vehicletypeid_value = selectAnswer(
        vehicleType.displayName,
        vehicleType.valueData,
      );
    }
  }

  return updates;
}

/** Empty select answers for the autofill keys (used when RDW fails or the plate changes). */
export function clearRdwAutofillAnswers(
  fieldKeys: ReadonlySet<string>,
  pleaseSelectLabel: string,
): ServiceFormAnswers {
  const updates: ServiceFormAnswers = {};
  for (const key of RDW_AUTOFILL_FIELD_NAMES) {
    if (fieldKeys.has(key)) {
      updates[key] = { value: '', displayValue: pleaseSelectLabel };
    }
  }
  return updates;
}

export function rdwReadonlyDisplay(fieldKey: string, rdwInfo: RdwInfo | null): string | undefined {
  switch (fieldKey) {
    case 'dn_vehiclebrand':
      return rdwInfo?.model ?? undefined;
    case 'dn_vehicletradename':
      return rdwInfo?.tradeName ?? undefined;
    case 'dn_vwe_vehicleinformationid.vwe_rdw_kleur1':
      return rdwInfo?.primaryColor ?? undefined;
    default:
      return undefined;
  }
}

/**
 * Splits a section's fields into a vehicle group (if any plate/vehicle key is present) and the
 * remaining fields, preserving non-vehicle order for the rest.
 */
export function partitionVehicleRegistrationFields<T extends { key: string }>(
  fields: readonly T[],
): { vehicleFields: T[]; otherFields: T[] } {
  const vehicleFields: T[] = [];
  const otherFields: T[] = [];
  let hasVehicle = false;
  for (const field of fields) {
    if (isVehicleRegistrationField(field.key)) {
      hasVehicle = true;
      vehicleFields.push(field);
    } else {
      otherFields.push(field);
    }
  }
  if (!hasVehicle || !vehicleFields.some((field) => isRdwPlateField(field.key))) {
    return { vehicleFields: [], otherFields: [...fields] };
  }
  return { vehicleFields, otherFields };
}
