/**
 * Compact person name group driven by `person_group` metadata on a marker field.
 * v1 consumes name roles only; phone/email/company stay loose fields.
 */

import { z } from 'zod';
import {
  formatPersonNamePreview,
  parsePersonName,
  type ParsedPersonName,
} from './parse-person-name';
import type { ServiceFormAnswer, ServiceFormAnswers, ServiceFormField } from './types';

export const PERSON_NAME_FLOW = 'person_v1' as const;

export type PersonNameFieldRole =
  'salutation' | 'initials' | 'firstName' | 'middleName' | 'lastName';

export type PersonNameFieldMapping = Partial<Record<PersonNameFieldRole, string>>;

export type ServiceFormPersonGroupNameFields = {
  lastName: string;
  salutation?: string;
  initials?: string;
  firstName?: string;
  middleName?: string;
};

export type PersonNameGroupConfig = {
  id: string;
  label: { nl?: string; en?: string };
  fields: ServiceFormPersonGroupNameFields;
  flow: typeof PERSON_NAME_FLOW;
  confirmName: boolean;
  /** Optional CRM keys kept for later slices; not consumed by v1 UI. */
  gate?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  company?: string;
  addressGroupId?: string | null;
  copyFrom?: string | null;
};

export type PersonNameEntryGroup = {
  anchor: ServiceFormField;
  mapping: PersonNameFieldMapping;
  config: PersonNameGroupConfig;
  /** Shown above free-text; not part of parse/summary. */
  salutationField: ServiceFormField | null;
  /** Manual name roles (no salutation). */
  orderedFields: ServiceFormField[];
};

export type PersonNameRenderItem =
  { kind: 'person-name'; group: PersonNameEntryGroup } | { kind: 'field'; field: ServiceFormField };

/** Roles shown in manual entry and green summary (salutation is a separate dropdown above). */
const VISIBLE_NAME_ROLE_ORDER: readonly PersonNameFieldRole[] = [
  'initials',
  'firstName',
  'middleName',
  'lastName',
];

/** All mapped name roles including salutation (claimed so the field stays out of loose render). */
const NAME_ROLE_ORDER: readonly PersonNameFieldRole[] = ['salutation', ...VISIBLE_NAME_ROLE_ORDER];

const localizedLabelSchema = z.array(
  z.looseObject({
    'language-code': z.number().optional(),
    value: z.string().optional(),
  }),
);

const personGroupSchema = z.looseObject({
  id: z.string().min(1),
  label: localizedLabelSchema.optional(),
  fields: z.looseObject({
    lastName: z.string().min(1),
    salutation: z.string().min(1).optional(),
    initials: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    middleName: z.string().min(1).optional(),
    phone1: z.string().min(1).optional(),
    phone2: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    company: z.string().min(1).optional(),
  }),
  flow: z.literal(PERSON_NAME_FLOW),
  confirmName: z.boolean().optional(),
  gate: z.string().min(1).optional(),
  addressGroupId: z.string().nullable().optional(),
  copyFrom: z.string().nullable().optional(),
});

const pickLabel = (
  label: Array<{ 'language-code'?: number; value?: string }> | undefined,
  languageCode: number,
): string | undefined => {
  const match = label?.find((entry) => entry['language-code'] === languageCode)?.value?.trim();
  return match || undefined;
};

const textAnswer = (text: string): ServiceFormAnswer => ({
  value: text,
  displayValue: text,
});

export function readPersonNameGroup(raw: Record<string, unknown>): PersonNameGroupConfig | null {
  const parsed = personGroupSchema.safeParse(raw.person_group);
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
      lastName: value.fields.lastName,
      ...(value.fields.salutation ? { salutation: value.fields.salutation } : {}),
      ...(value.fields.initials ? { initials: value.fields.initials } : {}),
      ...(value.fields.firstName ? { firstName: value.fields.firstName } : {}),
      ...(value.fields.middleName ? { middleName: value.fields.middleName } : {}),
    },
    flow: PERSON_NAME_FLOW,
    confirmName: value.confirmName ?? true,
    ...(value.gate ? { gate: value.gate } : {}),
    ...(value.fields.phone1 ? { phone1: value.fields.phone1 } : {}),
    ...(value.fields.phone2 ? { phone2: value.fields.phone2 } : {}),
    ...(value.fields.email ? { email: value.fields.email } : {}),
    ...(value.fields.company ? { company: value.fields.company } : {}),
    ...(value.addressGroupId !== undefined ? { addressGroupId: value.addressGroupId } : {}),
    ...(value.copyFrom !== undefined ? { copyFrom: value.copyFrom } : {}),
  };
}

export function toPersonNameFieldMapping(
  fields: ServiceFormPersonGroupNameFields,
): PersonNameFieldMapping {
  const mapping: PersonNameFieldMapping = { lastName: fields.lastName };
  if (fields.salutation) mapping.salutation = fields.salutation;
  if (fields.initials) mapping.initials = fields.initials;
  if (fields.firstName) mapping.firstName = fields.firstName;
  if (fields.middleName) mapping.middleName = fields.middleName;
  return mapping;
}

export function buildPersonNameGroup(
  anchor: ServiceFormField,
  fieldByKey: ReadonlyMap<string, ServiceFormField>,
): PersonNameEntryGroup | null {
  const config = readPersonNameGroup(anchor.raw as Record<string, unknown>);
  if (!config) {
    return null;
  }
  const mapping = toPersonNameFieldMapping(config.fields);
  const lastNameField = fieldByKey.get(mapping.lastName ?? '');
  if (!lastNameField) {
    return null;
  }

  const salutationKey = mapping.salutation;
  const salutationField = salutationKey ? (fieldByKey.get(salutationKey) ?? null) : null;

  const seen = new Set<string>();
  const orderedFields = VISIBLE_NAME_ROLE_ORDER.flatMap((role) => {
    const key = mapping[role];
    const field = key ? fieldByKey.get(key) : undefined;
    if (!field || seen.has(field.key)) {
      return [];
    }
    seen.add(field.key);
    return [field];
  });

  return { anchor, mapping, config, salutationField, orderedFields };
}

/** Name roles consumed by the person-name group UI (hide from loose render). */
export function personNameConsumedKeys(mapping: PersonNameFieldMapping): string[] {
  return NAME_ROLE_ORDER.flatMap((role) => {
    const key = mapping[role];
    return key ? [key] : [];
  });
}

export function buildPersonNameRenderItems(fields: ServiceFormField[]): PersonNameRenderItem[] {
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const groupByAnchorId = new Map<string, PersonNameEntryGroup>();
  const claimedFieldIds = new Set<string>();

  for (const field of fields) {
    const group = buildPersonNameGroup(field, fieldByKey);
    if (!group) {
      continue;
    }
    const groupFieldIds = personNameConsumedKeys(group.mapping).flatMap((key) => {
      const mapped = fieldByKey.get(key);
      return mapped ? [mapped.id] : [];
    });
    if (groupFieldIds.some((fieldId) => claimedFieldIds.has(fieldId))) {
      continue;
    }
    groupFieldIds.forEach((fieldId) => claimedFieldIds.add(fieldId));
    groupByAnchorId.set(group.anchor.id, group);
  }

  return fields.flatMap((field): PersonNameRenderItem[] => {
    const group = groupByAnchorId.get(field.id);
    if (group) {
      return [{ kind: 'person-name', group }];
    }
    if (claimedFieldIds.has(field.id)) {
      return [];
    }
    return [{ kind: 'field', field }];
  });
}

export function findPersonNameGroupInFields(
  fields: readonly ServiceFormField[],
): PersonNameEntryGroup | null {
  for (const item of buildPersonNameRenderItems([...fields])) {
    if (item.kind === 'person-name') {
      return item.group;
    }
  }
  return null;
}

/**
 * Keeps person-name groups at their anchor position and returns the remaining
 * fields in contiguous runs for address/field rendering.
 */
export function partitionFieldsAroundPersonNameGroups(
  fields: ServiceFormField[],
): Array<
  | { kind: 'person-name'; group: PersonNameEntryGroup }
  | { kind: 'fields'; fields: ServiceFormField[] }
> {
  const blocks: Array<
    | { kind: 'person-name'; group: PersonNameEntryGroup }
    | { kind: 'fields'; fields: ServiceFormField[] }
  > = [];
  let pending: ServiceFormField[] = [];

  const flushFields = (): void => {
    if (pending.length === 0) {
      return;
    }
    blocks.push({ kind: 'fields', fields: pending });
    pending = [];
  };

  for (const item of buildPersonNameRenderItems(fields)) {
    if (item.kind === 'person-name') {
      flushFields();
      blocks.push({ kind: 'person-name', group: item.group });
      continue;
    }
    pending.push(item.field);
  }
  flushFields();
  return blocks;
}

export function buildClearedPersonNameAnswers(
  mapping: PersonNameFieldMapping,
  _pleaseSelectLabel: string,
): ServiceFormAnswers {
  const cleared: ServiceFormAnswers = {};
  for (const role of VISIBLE_NAME_ROLE_ORDER) {
    const key = mapping[role];
    if (!key) {
      continue;
    }
    cleared[key] = { value: '', displayValue: '' };
  }
  return cleared;
}

export function buildPersonNameAnswers(
  mapping: PersonNameFieldMapping,
  parsed: ParsedPersonName,
  options: {
    pleaseSelectLabel: string;
  },
): ServiceFormAnswers {
  const updates = buildClearedPersonNameAnswers(mapping, options.pleaseSelectLabel);

  if (mapping.initials && parsed.initials) {
    updates[mapping.initials] = textAnswer(parsed.initials);
  }
  if (mapping.firstName && parsed.firstName) {
    updates[mapping.firstName] = textAnswer(parsed.firstName);
  }
  if (mapping.middleName && parsed.middleName) {
    updates[mapping.middleName] = textAnswer(parsed.middleName);
  }
  if (mapping.lastName && parsed.lastName) {
    updates[mapping.lastName] = textAnswer(parsed.lastName);
  }

  return updates;
}

export function previewPersonNameParse(freeText: string): {
  parsed: ParsedPersonName;
  preview: string;
} {
  const parsed = parsePersonName(freeText);
  return {
    parsed,
    preview: formatPersonNamePreview(parsed),
  };
}

export function hasAppliedPersonNameAnswers(
  mapping: PersonNameFieldMapping,
  answers: ServiceFormAnswers,
  pleaseSelectLabel: string,
): boolean {
  const lastKey = mapping.lastName;
  if (!lastKey) {
    return false;
  }
  const last = String(answers[lastKey]?.displayValue ?? answers[lastKey]?.value ?? '').trim();
  if (!last || last === pleaseSelectLabel) {
    return false;
  }
  return true;
}

export function buildPersonNameSummary(
  mapping: PersonNameFieldMapping,
  answers: ServiceFormAnswers,
  pleaseSelectLabel: string,
): string | null {
  const parts = VISIBLE_NAME_ROLE_ORDER.flatMap((role) => {
    const key = mapping[role];
    if (!key) {
      return [];
    }
    const text = String(answers[key]?.displayValue ?? answers[key]?.value ?? '').trim();
    if (!text || text === pleaseSelectLabel) {
      return [];
    }
    return [text];
  });
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Role inputs stay hidden until the berger opens manual entry (address-group pattern). */
export function shouldShowPersonNameDetailFields(state: { manualEntryActive: boolean }): boolean {
  return state.manualEntryActive;
}

/** Offer "enter manually" while the compact free-text flow is still the primary path. */
export function shouldOfferPersonNameManualEntry(state: {
  hasAppliedAnswers: boolean;
  manualEntryActive: boolean;
}): boolean {
  return !state.hasAppliedAnswers && !state.manualEntryActive;
}

/** Compact banner text; hidden while the berger is editing manually. */
export function resolvePersonNameSummaryDisplay(
  mapping: PersonNameFieldMapping,
  answers: ServiceFormAnswers,
  pleaseSelectLabel: string,
  state: { manualEntryActive: boolean },
): string | null {
  if (state.manualEntryActive) {
    return null;
  }
  return buildPersonNameSummary(mapping, answers, pleaseSelectLabel);
}
