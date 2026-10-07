import {
  readAddressComponentMapping,
  type AddressComponentMapping,
} from './address-place-selection';
import { groupSectionFields, type FieldGroup } from './field-kind';
import type { ServiceFormAnswers, ServiceFormField } from './types';

export type AddressEntryConfig = {
  version: 1;
  postcodeHouseNumberLookup: boolean;
  addressSearch: boolean;
  manualEntry: boolean;
  hideResolvedFieldsInitially: boolean;
};

export type AddressEntryGroup = {
  anchor: ServiceFormField;
  mapping: AddressComponentMapping;
  config: AddressEntryConfig;
  orderedFields: ServiceFormField[];
};

export type AddressEntryRenderItem =
  { kind: 'address-entry'; group: AddressEntryGroup } | { kind: 'field'; field: ServiceFormField };

export type AddressEntrySectionRenderItem =
  { kind: 'address-entry'; group: AddressEntryGroup } | FieldGroup;

const COMPONENT_ORDER: (keyof AddressComponentMapping)[] = [
  'postalcode',
  'houseno',
  'housenoadd',
  'street',
  'city',
  'province',
  'country',
  'name',
];

const REQUIRED_COMPONENTS: (keyof AddressComponentMapping)[] = [
  'postalcode',
  'houseno',
  'street',
  'city',
];

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readBoolean = (value: unknown): boolean | null =>
  value === true || value === false ? value : null;

export function readAddressEntryConfig(raw: Record<string, unknown>): AddressEntryConfig | null {
  const extensions = asRecord(raw.ui_extensions);
  const addressEntry = asRecord(extensions?.address_entry);
  if (addressEntry?.version !== 1) {
    return null;
  }

  const postcodeHouseNumberLookup = readBoolean(addressEntry.postcode_house_number_lookup);
  const addressSearch = readBoolean(addressEntry.address_search);
  const manualEntry = readBoolean(addressEntry.manual_entry);
  const hideResolvedFieldsInitially = readBoolean(addressEntry.hide_resolved_fields_initially);
  if (
    postcodeHouseNumberLookup === null ||
    addressSearch === null ||
    manualEntry === null ||
    hideResolvedFieldsInitially === null
  ) {
    return null;
  }

  return {
    version: 1,
    postcodeHouseNumberLookup,
    addressSearch,
    manualEntry,
    hideResolvedFieldsInitially,
  };
}

const buildGroup = (
  anchor: ServiceFormField,
  fieldByKey: ReadonlyMap<string, ServiceFormField>,
): AddressEntryGroup | null => {
  if (anchor.type.toLowerCase() !== 'address') {
    return null;
  }
  const config = readAddressEntryConfig(anchor.raw);
  const mapping = readAddressComponentMapping(anchor.raw);
  if (!config || !mapping) {
    return null;
  }
  if (REQUIRED_COMPONENTS.some((component) => !mapping[component])) {
    return null;
  }

  const orderedFields = COMPONENT_ORDER.flatMap((component) => {
    const fieldKey = mapping[component];
    const field = fieldKey ? fieldByKey.get(fieldKey) : undefined;
    return field ? [field] : [];
  });
  const availableKeys = new Set(orderedFields.map((field) => field.key));
  if (REQUIRED_COMPONENTS.some((component) => !availableKeys.has(mapping[component] ?? ''))) {
    return null;
  }

  return { anchor, mapping, config, orderedFields };
};

export function buildAddressEntryRenderItems(fields: ServiceFormField[]): AddressEntryRenderItem[] {
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const groupByAnchorId = new Map<string, AddressEntryGroup>();
  const claimedFieldIds = new Set<string>();

  for (const field of fields) {
    const group = buildGroup(field, fieldByKey);
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

  return fields.flatMap((field): AddressEntryRenderItem[] => {
    const group = groupByAnchorId.get(field.id);
    if (group) {
      return [{ kind: 'address-entry', group }];
    }
    if (claimedFieldIds.has(field.id)) {
      return [];
    }
    return [{ kind: 'field', field }];
  });
}

export function buildAddressEntrySectionRenderItems(
  fields: ServiceFormField[],
): AddressEntrySectionRenderItem[] {
  const result: AddressEntrySectionRenderItem[] = [];
  let pendingFields: ServiceFormField[] = [];
  const flushFields = (): void => {
    result.push(...groupSectionFields(pendingFields));
    pendingFields = [];
  };

  for (const item of buildAddressEntryRenderItems(fields)) {
    if (item.kind === 'field') {
      pendingFields.push(item.field);
      continue;
    }
    flushFields();
    result.push(item);
  }
  flushFields();
  return result;
}

const lookupFieldKeys = (group: AddressEntryGroup): Set<string> =>
  new Set(
    [group.mapping.postalcode, group.mapping.houseno, group.mapping.housenoadd].filter(
      (fieldKey): fieldKey is string => Boolean(fieldKey),
    ),
  );

export function getAddressEntryLookupFields(group: AddressEntryGroup): ServiceFormField[] {
  const keys = lookupFieldKeys(group);
  return group.orderedFields.filter((field) => keys.has(field.key));
}

export function getAddressEntryResolvedFields(group: AddressEntryGroup): ServiceFormField[] {
  const keys = lookupFieldKeys(group);
  return group.orderedFields.filter((field) => !keys.has(field.key));
}

const hasAnswer = (answers: ServiceFormAnswers, fieldKey: string): boolean => {
  const answer = answers[fieldKey];
  const value = answer?.displayValue ?? answer?.value;
  return value !== null && value !== undefined && String(value).trim() !== '';
};

export function shouldShowResolvedAddressFields(
  group: AddressEntryGroup,
  answers: ServiceFormAnswers,
  state: { manualEntryActive: boolean; lookupFailed: boolean },
): boolean {
  if (
    !group.config.hideResolvedFieldsInitially ||
    (group.config.manualEntry && (state.manualEntryActive || state.lookupFailed))
  ) {
    return true;
  }
  return [group.anchor, ...getAddressEntryResolvedFields(group)].some((field) =>
    hasAnswer(answers, field.key),
  );
}

export function buildClearedAddressEntryAnswers(group: AddressEntryGroup): ServiceFormAnswers {
  const cleared: ServiceFormAnswers = {
    [group.anchor.key]: { value: '', displayValue: '' },
  };
  for (const field of getAddressEntryResolvedFields(group)) {
    cleared[field.key] = { value: '', displayValue: '' };
  }
  return cleared;
}
