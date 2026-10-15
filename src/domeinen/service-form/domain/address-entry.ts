import {
  readAddressComponentMapping,
  type AddressComponentMapping,
} from './address-place-selection';
import { groupSectionFields, type FieldGroup } from './field-kind';
import type { ServiceFormAddressGroup, ServiceFormAnswers, ServiceFormField } from './types';

export type AddressEntryConfig = {
  version: 1;
  postcodeHouseNumberLookup: boolean;
  addressSearch: boolean;
  manualEntry: boolean;
  hideResolvedFieldsInitially: boolean;
  confirmAddress: boolean;
  allowForeignManual: boolean;
};

export type AddressEntryGroup = {
  anchor: ServiceFormField;
  mapping: AddressComponentMapping;
  config: AddressEntryConfig;
  orderedFields: ServiceFormField[];
  isCompactAddressGroup: boolean;
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

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const readAddressGroupMetadata = (raw: Record<string, unknown>): ServiceFormAddressGroup | null => {
  const addressGroup = asRecord(raw.address_group);
  const fields = asRecord(addressGroup?.fields);
  if (!addressGroup || !fields) {
    return null;
  }

  const id = readString(addressGroup.id);
  const postalCode = readString(fields.postalCode);
  const houseNumber = readString(fields.houseNumber);
  const addition = readString(fields.addition) ?? undefined;
  const street = readString(fields.street) ?? undefined;
  const city = readString(fields.city) ?? undefined;
  const country = readString(fields.country) ?? undefined;
  const confirmAddress = readBoolean(addressGroup.confirmAddress);
  const allowManual = readBoolean(addressGroup.allowManual);
  const allowForeignManual = readBoolean(addressGroup.allowForeignManual);

  if (
    !id ||
    !postalCode ||
    !houseNumber ||
    confirmAddress === null ||
    allowManual === null ||
    allowForeignManual === null
  ) {
    return null;
  }

  return {
    id,
    fields: { postalCode, houseNumber, addition, street, city, country },
    confirmAddress,
    allowManual,
    allowForeignManual,
  };
};

const readAddressGroupConfig = (
  raw: Record<string, unknown>,
): { config: AddressEntryConfig; mapping: AddressComponentMapping } | null => {
  const metadata = readAddressGroupMetadata(raw);
  if (!metadata) {
    return null;
  }

  return {
    config: {
      version: 1,
      postcodeHouseNumberLookup: true,
      addressSearch: false,
      manualEntry: metadata.allowManual,
      hideResolvedFieldsInitially: true,
      confirmAddress: metadata.confirmAddress,
      allowForeignManual: metadata.allowForeignManual,
    },
    mapping: {
      postalcode: metadata.fields.postalCode,
      houseno: metadata.fields.houseNumber,
      housenoadd: metadata.fields.addition,
      street: metadata.fields.street,
      city: metadata.fields.city,
      country: metadata.fields.country,
    },
  };
};

export function readAddressEntryConfig(raw: Record<string, unknown>): AddressEntryConfig | null {
  const addressGroup = readAddressGroupConfig(raw);
  if (addressGroup) {
    return addressGroup.config;
  }
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
    confirmAddress: false,
    allowForeignManual: false,
  };
}

const buildGroup = (
  anchor: ServiceFormField,
  fieldByKey: ReadonlyMap<string, ServiceFormField>,
): AddressEntryGroup | null => {
  const addressGroup = readAddressGroupConfig(anchor.raw);
  if (!addressGroup && anchor.type.toLowerCase() !== 'address') {
    return null;
  }
  const config = addressGroup?.config ?? readAddressEntryConfig(anchor.raw);
  const mapping = addressGroup?.mapping ?? readAddressComponentMapping(anchor.raw);
  if (!config || !mapping) {
    return null;
  }
  const isCompact = Boolean(addressGroup);
  // Compact address_group only requires postal code + house number (taxi route).
  // Legacy address_components keep requiring street and city.
  const requiredComponents: readonly (keyof AddressComponentMapping)[] = isCompact
    ? ['postalcode', 'houseno']
    : REQUIRED_COMPONENTS;
  if (requiredComponents.some((component) => !mapping[component])) {
    return null;
  }

  const seenFieldKeys = new Set<string>();
  const orderedFields = COMPONENT_ORDER.flatMap((component) => {
    const fieldKey = mapping[component];
    const field = fieldKey ? fieldByKey.get(fieldKey) : undefined;
    if (!field || seenFieldKeys.has(field.key)) {
      return [];
    }
    seenFieldKeys.add(field.key);
    return [field];
  });
  const availableKeys = new Set(orderedFields.map((field) => field.key));
  if (requiredComponents.some((component) => !availableKeys.has(mapping[component] ?? ''))) {
    return null;
  }

  return { anchor, mapping, config, orderedFields, isCompactAddressGroup: isCompact };
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
  state: {
    manualEntryActive: boolean;
    lookupFailed: boolean;
    lookupReady?: boolean;
    lookupApplied?: boolean;
    foreignLocationActive?: boolean;
  },
): boolean {
  if (group.isCompactAddressGroup) {
    // Input fields stay hidden; applied addresses are shown as a summary instead.
    return state.foreignLocationActive === true;
  }
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

const answerDisplay = (answers: ServiceFormAnswers, fieldKey: string | undefined): string => {
  if (!fieldKey) {
    return '';
  }
  const answer = answers[fieldKey];
  return String(answer?.displayValue ?? answer?.value ?? '').trim();
};

/** Compact Dutch-style one-liner for a looked-up address (not shown as input fields). */
export function buildCompactAddressSummary(
  group: AddressEntryGroup,
  answers: ServiceFormAnswers,
): string | null {
  const street = answerDisplay(answers, group.mapping.street);
  const city = answerDisplay(answers, group.mapping.city);
  const houseNumber = answerDisplay(answers, group.mapping.houseno);
  const houseNumberAddition = answerDisplay(answers, group.mapping.housenoadd);
  const postalCode = answerDisplay(answers, group.mapping.postalcode);
  const country = answerDisplay(answers, group.mapping.country);
  const housePart = `${houseNumber}${houseNumberAddition}`.trim();

  // Postal-only groups (no street/city roles): fall back to postcode + house number.
  if (!group.mapping.street && !group.mapping.city) {
    const parts = [[postalCode, housePart].filter((part) => part !== '').join(' '), country].filter(
      (part) => part !== '',
    );
    return parts.length > 0 ? parts.join(', ') : null;
  }

  if (street === '' && city === '') {
    return null;
  }

  const streetLine = [street, housePart].filter((part) => part !== '').join(' ');
  const cityLine = [postalCode, city].filter((part) => part !== '').join(' ');
  const parts = [streetLine, cityLine, country].filter((part) => part !== '');
  return parts.length > 0 ? parts.join(', ') : null;
}

export function buildClearedAddressEntryAnswers(group: AddressEntryGroup): ServiceFormAnswers {
  const cleared: ServiceFormAnswers = group.isCompactAddressGroup
    ? {}
    : { [group.anchor.key]: { value: '', displayValue: '' } };
  for (const field of getAddressEntryResolvedFields(group)) {
    cleared[field.key] = { value: '', displayValue: '' };
  }
  return cleared;
}

export function hasResolvedAddressComponentAnswers(
  group: AddressEntryGroup,
  answers: ServiceFormAnswers,
): boolean {
  return [group.mapping.street, group.mapping.city].some((fieldKey) =>
    fieldKey ? hasAnswer(answers, fieldKey) : false,
  );
}

/** Compact groups wait for an explicit Find-address press (`requestedLookupKey`). */
export function isPostalAddressLookupQueryEnabled(input: {
  readOnly: boolean;
  foreignLocationActive: boolean;
  postcodeHouseNumberLookup: boolean;
  hasLookupCapability: boolean;
  lookupReady: boolean;
  isCompactAddressGroup: boolean;
  requestedLookupKey: string | null;
  lookupKey: string;
  hasResolvedAnswers: boolean;
  manualEntryActive: boolean;
}): boolean {
  return Boolean(
    !input.readOnly &&
    !input.foreignLocationActive &&
    input.postcodeHouseNumberLookup &&
    input.hasLookupCapability &&
    input.lookupReady &&
    (!input.isCompactAddressGroup || input.requestedLookupKey === input.lookupKey) &&
    !input.hasResolvedAnswers &&
    !input.manualEntryActive,
  );
}

export function shouldOfferForeignLocationEntry(
  group: AddressEntryGroup,
  foreignLocationActive: boolean,
): boolean {
  return (
    group.isCompactAddressGroup && group.config.postcodeHouseNumberLookup && !foreignLocationActive
  );
}

export function shouldOfferNonCompactManualEntry(group: AddressEntryGroup): boolean {
  return !group.isCompactAddressGroup && group.config.manualEntry;
}

export function resolveCompactAddressSummaryDisplay(
  group: AddressEntryGroup,
  answers: ServiceFormAnswers,
  state: { foreignLocationActive: boolean; appliedAddressSummary: string | null },
): string | null {
  if (!group.isCompactAddressGroup || state.foreignLocationActive) {
    return null;
  }
  return state.appliedAddressSummary ?? buildCompactAddressSummary(group, answers);
}

/** Hide Find address once a looked-up address is applied; show reset instead. */
export function shouldShowCompactLookupAction(input: {
  hasResolvedAnswers: boolean;
  appliedAddressSummary: string | null;
}): boolean {
  return !input.hasResolvedAnswers && input.appliedAddressSummary === null;
}

export function isCompactLookupActionDisabled(input: {
  lookupReady: boolean;
  hasLookupCapability: boolean;
  isFetching: boolean;
}): boolean {
  return !input.lookupReady || !input.hasLookupCapability || input.isFetching;
}

/** Fields shown as inputs: all when foreign, otherwise only postal lookup fields. */
export function visibleCompactAddressFields(
  group: AddressEntryGroup,
  foreignLocationActive: boolean,
): ServiceFormField[] {
  return foreignLocationActive ? group.orderedFields : getAddressEntryLookupFields(group);
}
