/**
 * Compact license-plate / RDW group driven by `license_plate_group` metadata on a marker field.
 * Flat CRM fields stay in the schema; the group only maps roles and drives the UI flow.
 */

import { z } from 'zod';
import type { ServiceFormAnswer, ServiceFormAnswers, ServiceFormField } from './types';

export const LICENSE_PLATE_FLOW = 'nl_rdw_lookup' as const;

export type LicensePlateFieldRole =
  | 'foundPlate'
  | 'reportedPlate'
  | 'country'
  | 'rdwBrand'
  | 'rdwType'
  | 'rdwColor'
  | 'brand'
  | 'type';

export type LicensePlateFieldMapping = Partial<Record<LicensePlateFieldRole, string>>;

export type ServiceFormLicensePlateGroupFields = {
  foundPlate: string;
  reportedPlate?: string;
  country?: string;
  rdwBrand?: string;
  rdwType?: string;
  rdwColor?: string;
  brand: string;
  type?: string;
};

export type LicensePlateGroupConfig = {
  id: string;
  label: { nl?: string; en?: string };
  fields: ServiceFormLicensePlateGroupFields;
  flow: typeof LICENSE_PLATE_FLOW;
  confirmVehicle: boolean;
  allowManual: boolean;
  allowForeignManual: boolean;
};

export type LicensePlateEntryGroup = {
  anchor: ServiceFormField;
  mapping: LicensePlateFieldMapping;
  config: LicensePlateGroupConfig;
  orderedFields: ServiceFormField[];
};

export type LicensePlateRenderItem =
  | { kind: 'license-plate'; group: LicensePlateEntryGroup }
  | { kind: 'field'; field: ServiceFormField };

export type LicensePlateSectionRenderItem =
  | { kind: 'license-plate'; group: LicensePlateEntryGroup }
  | { kind: 'field'; field: ServiceFormField };

/** Fixed role → CRM key mapping used when no `license_plate_group` is present. */
export const LEGACY_LICENSE_PLATE_MAPPING: Readonly<Required<LicensePlateFieldMapping>> = {
  foundPlate: 'dn_vehicleregistrationno',
  reportedPlate: 'dn_vehicleregistrationoinitial',
  country: '_dn_vehiclecountryoforiginid_value',
  rdwBrand: 'dn_vehiclebrand',
  rdwType: 'dn_vehicletradename',
  rdwColor: 'dn_vwe_vehicleinformationid.vwe_rdw_kleur1',
  brand: '_dn_vehiclebrandid_value',
  type: '_dn_vehicletypeid_value',
};

/** Alternate plate trigger used by some schemas instead of `dn_vehicleregistrationno`. */
export const LEGACY_ALTERNATE_FOUND_PLATE = 'dn_vehicleregistration';

const localizedLabelSchema = z.array(
  z.looseObject({
    'language-code': z.number().optional(),
    value: z.string().optional(),
  }),
);

const licensePlateGroupSchema = z.looseObject({
  id: z.string().min(1),
  label: localizedLabelSchema.optional(),
  fields: z.looseObject({
    foundPlate: z.string().min(1),
    reportedPlate: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    rdwBrand: z.string().min(1).optional(),
    rdwType: z.string().min(1).optional(),
    rdwColor: z.string().min(1).optional(),
    brand: z.string().min(1),
    type: z.string().min(1).optional(),
  }),
  flow: z.literal(LICENSE_PLATE_FLOW),
  confirmVehicle: z.boolean().optional(),
  allowManual: z.boolean().optional(),
  allowForeignManual: z.boolean().optional(),
});

const ROLE_ORDER: readonly LicensePlateFieldRole[] = [
  'reportedPlate',
  'foundPlate',
  'country',
  'rdwBrand',
  'rdwType',
  'rdwColor',
  'brand',
  'type',
];

const pickLabel = (
  label: Array<{ 'language-code'?: number; value?: string }> | undefined,
  languageCode: number,
): string | undefined => {
  const match = label?.find((entry) => entry['language-code'] === languageCode)?.value?.trim();
  return match || undefined;
};

export function readLicensePlateGroup(
  raw: Record<string, unknown>,
): LicensePlateGroupConfig | null {
  const parsed = licensePlateGroupSchema.safeParse(raw.license_plate_group);
  if (!parsed.success) {
    return null;
  }
  const value = parsed.data;
  return {
    id: value.id,
    label: {
      nl: pickLabel(value.label, 1043),
      en: pickLabel(value.label, 1044),
    },
    fields: {
      foundPlate: value.fields.foundPlate,
      brand: value.fields.brand,
      ...(value.fields.reportedPlate ? { reportedPlate: value.fields.reportedPlate } : {}),
      ...(value.fields.country ? { country: value.fields.country } : {}),
      ...(value.fields.rdwBrand ? { rdwBrand: value.fields.rdwBrand } : {}),
      ...(value.fields.rdwType ? { rdwType: value.fields.rdwType } : {}),
      ...(value.fields.rdwColor ? { rdwColor: value.fields.rdwColor } : {}),
      ...(value.fields.type ? { type: value.fields.type } : {}),
    },
    flow: LICENSE_PLATE_FLOW,
    confirmVehicle: value.confirmVehicle ?? true,
    allowManual: value.allowManual ?? true,
    allowForeignManual: value.allowForeignManual ?? true,
  };
}

export function toLicensePlateFieldMapping(
  fields: ServiceFormLicensePlateGroupFields,
): LicensePlateFieldMapping {
  const mapping: LicensePlateFieldMapping = {
    foundPlate: fields.foundPlate,
    brand: fields.brand,
  };
  if (fields.reportedPlate) mapping.reportedPlate = fields.reportedPlate;
  if (fields.country) mapping.country = fields.country;
  if (fields.rdwBrand) mapping.rdwBrand = fields.rdwBrand;
  if (fields.rdwType) mapping.rdwType = fields.rdwType;
  if (fields.rdwColor) mapping.rdwColor = fields.rdwColor;
  if (fields.type) mapping.type = fields.type;
  return mapping;
}

export function resolveLegacyLicensePlateMapping(
  availableKeys: ReadonlySet<string>,
): LicensePlateFieldMapping | null {
  const foundPlate = availableKeys.has(LEGACY_LICENSE_PLATE_MAPPING.foundPlate)
    ? LEGACY_LICENSE_PLATE_MAPPING.foundPlate
    : availableKeys.has(LEGACY_ALTERNATE_FOUND_PLATE)
      ? LEGACY_ALTERNATE_FOUND_PLATE
      : null;
  if (!foundPlate || !availableKeys.has(LEGACY_LICENSE_PLATE_MAPPING.brand)) {
    return null;
  }
  const mapping: LicensePlateFieldMapping = {
    foundPlate,
    brand: LEGACY_LICENSE_PLATE_MAPPING.brand,
  };
  for (const role of ROLE_ORDER) {
    if (role === 'foundPlate' || role === 'brand') {
      continue;
    }
    const key = LEGACY_LICENSE_PLATE_MAPPING[role];
    if (availableKeys.has(key)) {
      mapping[role] = key;
    }
  }
  return mapping;
}

export function buildLicensePlateGroup(
  anchor: ServiceFormField,
  fieldByKey: ReadonlyMap<string, ServiceFormField>,
): LicensePlateEntryGroup | null {
  const config = readLicensePlateGroup(anchor.raw as Record<string, unknown>);
  if (!config) {
    return null;
  }
  const mapping = toLicensePlateFieldMapping(config.fields);
  const foundField = fieldByKey.get(mapping.foundPlate ?? '');
  const brandField = fieldByKey.get(mapping.brand ?? '');
  if (!foundField || !brandField) {
    return null;
  }

  const seen = new Set<string>();
  const orderedFields = ROLE_ORDER.flatMap((role) => {
    const key = mapping[role];
    const field = key ? fieldByKey.get(key) : undefined;
    if (!field || seen.has(field.key)) {
      return [];
    }
    seen.add(field.key);
    return [field];
  });

  return { anchor, mapping, config, orderedFields };
}

export function buildLicensePlateRenderItems(fields: ServiceFormField[]): LicensePlateRenderItem[] {
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const groupByAnchorId = new Map<string, LicensePlateEntryGroup>();
  const claimedFieldIds = new Set<string>();

  for (const field of fields) {
    const group = buildLicensePlateGroup(field, fieldByKey);
    if (!group) {
      continue;
    }
    const groupFieldIds = [group.anchor.id, ...group.orderedFields.map((item) => item.id)];
    if (groupFieldIds.some((fieldId) => claimedFieldIds.has(fieldId))) {
      continue;
    }
    groupFieldIds.forEach((fieldId) => claimedFieldIds.add(fieldId));
    groupByAnchorId.set(group.anchor.id, group);
  }

  return fields.flatMap((field): LicensePlateRenderItem[] => {
    const group = groupByAnchorId.get(field.id);
    if (group) {
      return [{ kind: 'license-plate', group }];
    }
    if (claimedFieldIds.has(field.id)) {
      return [];
    }
    return [{ kind: 'field', field }];
  });
}

export function findLicensePlateGroupInFields(
  fields: readonly ServiceFormField[],
): LicensePlateEntryGroup | null {
  for (const item of buildLicensePlateRenderItems([...fields])) {
    if (item.kind === 'license-plate') {
      return item.group;
    }
  }
  return null;
}

export function licensePlateRoleKeys(
  mapping: LicensePlateFieldMapping,
  roles: readonly LicensePlateFieldRole[],
): string[] {
  return roles.flatMap((role) => {
    const key = mapping[role];
    return key ? [key] : [];
  });
}

export function buildClearedLicensePlateAnswers(
  mapping: LicensePlateFieldMapping,
  roles: readonly LicensePlateFieldRole[],
  pleaseSelectLabel: string,
  selectRoles: ReadonlySet<LicensePlateFieldRole> = new Set(['country', 'brand', 'type']),
): ServiceFormAnswers {
  const cleared: ServiceFormAnswers = {};
  for (const role of roles) {
    const key = mapping[role];
    if (!key) {
      continue;
    }
    cleared[key] = selectRoles.has(role)
      ? { value: '', displayValue: pleaseSelectLabel }
      : { value: '', displayValue: '' };
  }
  return cleared;
}

export function buildLicensePlateSummary(
  mapping: LicensePlateFieldMapping,
  answers: ServiceFormAnswers,
  rdwOverlay?: { brand?: string | null; type?: string | null; color?: string | null },
): string | null {
  const display = (key: string | undefined): string => {
    if (!key) {
      return '';
    }
    const answer = answers[key];
    return String(answer?.displayValue ?? answer?.value ?? '').trim();
  };

  const brand =
    (rdwOverlay?.brand ?? '').trim() || display(mapping.rdwBrand) || display(mapping.brand);
  const type = (rdwOverlay?.type ?? '').trim() || display(mapping.rdwType) || display(mapping.type);
  const color = (rdwOverlay?.color ?? '').trim() || display(mapping.rdwColor);
  const country = display(mapping.country);
  const parts = [brand, type, color, country].filter((part) => part !== '');
  return parts.length > 0 ? parts.join(', ') : null;
}

export function answerText(answer: ServiceFormAnswer | undefined): string {
  return String(answer?.displayValue ?? answer?.value ?? '').trim();
}

// --- Pure UI state machine -------------------------------------------------

export const LicensePlatePhase = {
  ConfirmReported: 'confirm-reported',
  Entering: 'entering',
  LookingUp: 'looking-up',
  Summary: 'summary',
  Manual: 'manual',
  Foreign: 'foreign',
} as const;

export type LicensePlatePhase = (typeof LicensePlatePhase)[keyof typeof LicensePlatePhase];

export type LicensePlateUiState = {
  phase: LicensePlatePhase;
  foundPlate: string;
  reportedPlate: string | null;
  showTypeGap: boolean;
};

export type LicensePlateUiEvent =
  | { type: 'init'; reportedPlate: string | null; foundPlate: string }
  | { type: 'acceptReported' }
  | { type: 'rejectReported' }
  | { type: 'plateChanged'; plate: string; isDutch: boolean }
  | { type: 'lookupStarted' }
  | { type: 'lookupSucceeded'; typeMatched: boolean }
  | { type: 'lookupFailed' }
  | { type: 'confirmVehicleAccepted'; typeMatched: boolean }
  | { type: 'confirmVehicleRejected' }
  | { type: 'openManual' }
  | { type: 'openForeign' }
  | { type: 'reset' };

export function initialLicensePlateState(
  reportedPlate: string | null,
  foundPlate = '',
): LicensePlateUiState {
  const reported = reportedPlate?.trim() || null;
  const found = foundPlate.trim();
  if (reported && !found) {
    return {
      phase: LicensePlatePhase.ConfirmReported,
      foundPlate: '',
      reportedPlate: reported,
      showTypeGap: false,
    };
  }
  return {
    phase: LicensePlatePhase.Entering,
    foundPlate: found,
    reportedPlate: reported,
    showTypeGap: false,
  };
}

export function nextLicensePlateState(
  state: LicensePlateUiState,
  event: LicensePlateUiEvent,
): LicensePlateUiState {
  switch (event.type) {
    case 'init':
      return initialLicensePlateState(event.reportedPlate, event.foundPlate);
    case 'acceptReported': {
      if (!state.reportedPlate) {
        return state;
      }
      return {
        ...state,
        phase: LicensePlatePhase.Entering,
        foundPlate: state.reportedPlate,
        showTypeGap: false,
      };
    }
    case 'rejectReported':
      return {
        ...state,
        phase: LicensePlatePhase.Entering,
        foundPlate: '',
        showTypeGap: false,
      };
    case 'plateChanged': {
      if (state.phase === LicensePlatePhase.Foreign) {
        return { ...state, foundPlate: event.plate, showTypeGap: false };
      }
      return {
        ...state,
        phase: LicensePlatePhase.Entering,
        foundPlate: event.plate,
        showTypeGap: false,
      };
    }
    case 'lookupStarted':
      if (state.phase === LicensePlatePhase.Foreign) {
        return state;
      }
      return { ...state, phase: LicensePlatePhase.LookingUp, showTypeGap: false };
    case 'lookupSucceeded':
      return {
        ...state,
        phase: LicensePlatePhase.Summary,
        showTypeGap: !event.typeMatched,
      };
    case 'lookupFailed':
      return { ...state, phase: LicensePlatePhase.Manual, showTypeGap: false };
    case 'confirmVehicleAccepted':
      return {
        ...state,
        phase: LicensePlatePhase.Summary,
        showTypeGap: !event.typeMatched,
      };
    case 'confirmVehicleRejected':
      return { ...state, phase: LicensePlatePhase.Manual, showTypeGap: false };
    case 'openManual':
      return { ...state, phase: LicensePlatePhase.Manual, showTypeGap: false };
    case 'openForeign':
      return {
        ...state,
        phase: LicensePlatePhase.Foreign,
        showTypeGap: false,
      };
    case 'reset':
      return initialLicensePlateState(state.reportedPlate, '');
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function shouldShowManualVehicleFields(state: LicensePlateUiState): boolean {
  return (
    state.phase === LicensePlatePhase.Manual ||
    state.phase === LicensePlatePhase.Foreign ||
    (state.phase === LicensePlatePhase.Summary && state.showTypeGap)
  );
}

export function shouldShowRdwSummary(state: LicensePlateUiState): boolean {
  return state.phase === LicensePlatePhase.Summary && !state.showTypeGap;
}

export function shouldConfirmReported(state: LicensePlateUiState): boolean {
  return state.phase === LicensePlatePhase.ConfirmReported;
}
