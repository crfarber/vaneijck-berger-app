import { describe, expect, it } from 'vitest';
import type { ServiceFormField } from './types';
import {
  buildAddressEntryRenderItems,
  buildAddressEntrySectionRenderItems,
  buildClearedAddressEntryAnswers,
  buildCompactAddressSummary,
  hasResolvedAddressComponentAnswers,
  isCompactLookupActionDisabled,
  isPostalAddressLookupQueryEnabled,
  readAddressEntryConfig,
  resolveCompactAddressSummaryDisplay,
  shouldOfferForeignLocationEntry,
  shouldOfferNonCompactManualEntry,
  shouldShowCompactLookupAction,
  shouldShowResolvedAddressFields,
  visibleCompactAddressFields,
  type AddressEntryGroup,
} from './address-entry';

const field = (
  id: string,
  key: string,
  type = 'string',
  raw: ServiceFormField['raw'] = {},
): ServiceFormField => ({
  id,
  key,
  label: key,
  type,
  readOnly: false,
  optional: true,
  autocomplete: false,
  validations: [],
  raw,
});

const addressRaw: ServiceFormField['raw'] = {
  address_components: {
    postalcode: 'dn_postalcode',
    houseno: 'dn_houseno',
    housenoadd: 'dn_housenoadd',
    street: 'dn_street',
    city: 'dn_city',
  },
  ui_extensions: {
    address_entry: {
      version: 1,
      postcode_house_number_lookup: true,
      address_search: true,
      manual_entry: true,
      hide_resolved_fields_initially: true,
    },
  },
};

describe('address entry configuration', () => {
  it('reads supported version 1 metadata', () => {
    expect(readAddressEntryConfig(addressRaw)).toEqual({
      version: 1,
      postcodeHouseNumberLookup: true,
      addressSearch: true,
      manualEntry: true,
      hideResolvedFieldsInitially: true,
      confirmAddress: false,
      allowForeignManual: false,
    });
  });

  it('ignores unsupported metadata versions', () => {
    expect(
      readAddressEntryConfig({
        ...addressRaw,
        ui_extensions: { address_entry: { version: 2 } },
      }),
    ).toBeNull();
  });

  it('reads address group metadata from a marker field', () => {
    expect(
      readAddressEntryConfig({
        address_group: {
          id: 'dn_driverpostalcode',
          fields: {
            postalCode: 'dn_driverpostalcode',
            houseNumber: 'dn_driverhouseno',
            street: 'dn_driverstreet',
            city: 'dn_drivercity',
          },
          confirmAddress: true,
          allowManual: true,
          allowForeignManual: true,
        },
      }),
    ).toEqual({
      version: 1,
      postcodeHouseNumberLookup: true,
      addressSearch: false,
      manualEntry: true,
      hideResolvedFieldsInitially: true,
      confirmAddress: true,
      allowForeignManual: true,
    });
  });
});

describe('address entry grouping', () => {
  it('replaces mapped fields with one group at the address anchor position', () => {
    const items = buildAddressEntryRenderItems([
      field('before', 'dn_before'),
      field('address', 'dn_address', 'address', addressRaw),
      field('postalcode', 'dn_postalcode'),
      field('houseno', 'dn_houseno', 'number'),
      field('housenoadd', 'dn_housenoadd'),
      field('street', 'dn_street'),
      field('city', 'dn_city'),
      field('after', 'dn_after'),
    ]);

    expect(items.map((item) => item.kind)).toEqual(['field', 'address-entry', 'field']);
    const group = items[1];
    expect(group?.kind).toBe('address-entry');
    if (group?.kind === 'address-entry') {
      expect(group.group.orderedFields.map((item) => item.key)).toEqual([
        'dn_postalcode',
        'dn_houseno',
        'dn_housenoadd',
        'dn_street',
        'dn_city',
      ]);
    }
  });

  it('renders an address group at its marker and hides every mapped member once', () => {
    const markerRaw: ServiceFormField['raw'] = {
      address_group: {
        id: 'dn_driverpostalcode',
        fields: {
          postalCode: 'dn_driverpostalcode',
          houseNumber: 'dn_driverhouseno',
          addition: 'dn_driverhousenoaddition',
          street: 'dn_driverstreet',
          city: 'dn_drivercity',
          country: 'dn_drivercountryid_value',
        },
        confirmAddress: true,
        allowManual: true,
        allowForeignManual: true,
      },
    };
    const items = buildAddressEntryRenderItems([
      field('before', 'dn_before'),
      field('postalcode', 'dn_driverpostalcode', 'string', markerRaw),
      field('houseno', 'dn_driverhouseno'),
      field('housenoadd', 'dn_driverhousenoaddition'),
      field('street', 'dn_driverstreet'),
      field('city', 'dn_drivercity'),
      field('country', 'dn_drivercountryid_value'),
      field('after', 'dn_after'),
    ]);

    expect(items.map((item) => item.kind)).toEqual(['field', 'address-entry', 'field']);
    const group = items[1];
    expect(group?.kind).toBe('address-entry');
    if (group?.kind === 'address-entry') {
      expect(group.group.orderedFields.map((item) => item.key)).toEqual([
        'dn_driverpostalcode',
        'dn_driverhouseno',
        'dn_driverhousenoaddition',
        'dn_driverstreet',
        'dn_drivercity',
        'dn_drivercountryid_value',
      ]);
    }
  });

  it('deduplicates repeated address group field mappings', () => {
    const markerRaw: ServiceFormField['raw'] = {
      address_group: {
        id: 'dn_postalcode',
        fields: {
          postalCode: 'dn_postalcode',
          houseNumber: 'dn_houseno',
          addition: 'dn_houseno',
          street: 'dn_street',
          city: 'dn_city',
        },
        confirmAddress: false,
        allowManual: true,
        allowForeignManual: false,
      },
    };
    const items = buildAddressEntryRenderItems([
      field('postalcode', 'dn_postalcode', 'address', markerRaw),
      field('houseno', 'dn_houseno'),
      field('street', 'dn_street'),
      field('city', 'dn_city'),
    ]);

    const group = items[0];
    expect(group?.kind).toBe('address-entry');
    if (group?.kind === 'address-entry') {
      expect(group.group.orderedFields.map((item) => item.key)).toEqual([
        'dn_postalcode',
        'dn_houseno',
        'dn_street',
        'dn_city',
      ]);
    }
  });

  it('preserves readonly summaries around an address group', () => {
    const before = { ...field('before', 'dn_before'), readOnly: true };
    const after = { ...field('after', 'dn_after'), readOnly: true };

    expect(
      buildAddressEntrySectionRenderItems([
        before,
        field('address', 'dn_address', 'address', addressRaw),
        field('postalcode', 'dn_postalcode'),
        field('houseno', 'dn_houseno'),
        field('street', 'dn_street'),
        field('city', 'dn_city'),
        after,
      ]).map((item) => item.kind),
    ).toEqual(['readonly', 'address-entry', 'readonly']);
  });

  it('reveals resolved fields for existing answers, manual entry or a failed lookup', () => {
    const items = buildAddressEntryRenderItems([
      field('address', 'dn_address', 'address', addressRaw),
      field('postalcode', 'dn_postalcode'),
      field('houseno', 'dn_houseno'),
      field('street', 'dn_street'),
      field('city', 'dn_city'),
    ]);
    const item = items[0];
    expect(item?.kind).toBe('address-entry');
    if (item?.kind !== 'address-entry') {
      return;
    }

    expect(
      shouldShowResolvedAddressFields(
        item.group,
        {},
        { manualEntryActive: false, lookupFailed: false },
      ),
    ).toBe(false);
    expect(
      shouldShowResolvedAddressFields(
        item.group,
        { dn_street: { value: 'Teststraat', displayValue: 'Teststraat' } },
        { manualEntryActive: false, lookupFailed: false },
      ),
    ).toBe(true);
    expect(
      shouldShowResolvedAddressFields(
        item.group,
        {},
        { manualEntryActive: true, lookupFailed: false },
      ),
    ).toBe(true);
    expect(
      shouldShowResolvedAddressFields(
        item.group,
        {},
        { manualEntryActive: false, lookupFailed: true },
      ),
    ).toBe(true);
  });

  it('keeps compact street, city and country hidden until foreign location entry', () => {
    const compactGroupRaw: ServiceFormField['raw'] = {
      address_group: {
        id: 'dn_driverpostalcode',
        fields: {
          postalCode: 'dn_driverpostalcode',
          houseNumber: 'dn_driverhouseno',
          addition: 'dn_driverhousenoaddition',
          street: 'dn_driverstreet',
          city: 'dn_drivercity',
        },
        confirmAddress: true,
        allowManual: true,
        allowForeignManual: false,
      },
    };
    const item = buildAddressEntryRenderItems([
      field('postalcode', 'dn_driverpostalcode', 'string', compactGroupRaw),
      field('houseno', 'dn_driverhouseno'),
      field('addition', 'dn_driverhousenoaddition'),
      field('street', 'dn_driverstreet'),
      field('city', 'dn_drivercity'),
    ])[0];

    expect(item?.kind).toBe('address-entry');
    if (item?.kind !== 'address-entry') {
      return;
    }

    expect(
      shouldShowResolvedAddressFields(
        item.group,
        { dn_driverpostalcode: { value: '1234 AB', displayValue: '1234 AB' } },
        { manualEntryActive: false, lookupFailed: false, lookupReady: false },
      ),
    ).toBe(false);
    expect(
      shouldShowResolvedAddressFields(
        item.group,
        {},
        { manualEntryActive: true, lookupFailed: false, lookupReady: false },
      ),
    ).toBe(false);
    expect(
      shouldShowResolvedAddressFields(
        item.group,
        { dn_driverstreet: { value: 'Teststraat', displayValue: 'Teststraat' } },
        { manualEntryActive: false, lookupFailed: false, lookupReady: false },
      ),
    ).toBe(false);
    expect(
      shouldShowResolvedAddressFields(
        item.group,
        {},
        {
          manualEntryActive: false,
          lookupFailed: false,
          lookupReady: false,
          lookupApplied: true,
        },
      ),
    ).toBe(false);
    expect(
      shouldShowResolvedAddressFields(
        item.group,
        {},
        {
          manualEntryActive: false,
          lookupFailed: false,
          foreignLocationActive: true,
        },
      ),
    ).toBe(true);
  });

  it('builds a compact address summary from resolved answers', () => {
    const compactGroupRaw: ServiceFormField['raw'] = {
      address_group: {
        id: 'dn_driverpostalcode',
        fields: {
          postalCode: 'dn_driverpostalcode',
          houseNumber: 'dn_driverhouseno',
          addition: 'dn_driverhousenoaddition',
          street: 'dn_driverstreet',
          city: 'dn_drivercity',
          country: 'dn_drivercountryid_value',
        },
        confirmAddress: true,
        allowManual: true,
        allowForeignManual: true,
      },
    };
    const item = buildAddressEntryRenderItems([
      field('postalcode', 'dn_driverpostalcode', 'string', compactGroupRaw),
      field('houseno', 'dn_driverhouseno'),
      field('addition', 'dn_driverhousenoaddition'),
      field('street', 'dn_driverstreet'),
      field('city', 'dn_drivercity'),
      field('country', 'dn_drivercountryid_value'),
    ])[0];

    expect(item?.kind).toBe('address-entry');
    if (item?.kind !== 'address-entry') {
      return;
    }

    expect(buildCompactAddressSummary(item.group, {})).toBeNull();
    expect(
      buildCompactAddressSummary(item.group, {
        dn_driverstreet: { value: 'Dorpsstraat', displayValue: 'Dorpsstraat' },
        dn_driverhouseno: { value: '12', displayValue: '12' },
        dn_driverhousenoaddition: { value: 'A', displayValue: 'A' },
        dn_driverpostalcode: { value: '1234 AB', displayValue: '1234 AB' },
        dn_drivercity: { value: 'Voorbeeld', displayValue: 'Voorbeeld' },
        dn_drivercountryid_value: {
          value: 'nl',
          displayValue: 'Nederland',
          table: 'dn_country',
        },
      }),
    ).toBe('Dorpsstraat 12A, 1234 AB Voorbeeld, Nederland');
  });

  it('keeps resolved fields hidden after lookup failure when manual entry is disabled', () => {
    const items = buildAddressEntryRenderItems([
      field('address', 'dn_address', 'address', addressRaw),
      field('postalcode', 'dn_postalcode'),
      field('houseno', 'dn_houseno'),
      field('street', 'dn_street'),
      field('city', 'dn_city'),
    ]);
    const item = items[0];
    expect(item?.kind).toBe('address-entry');
    if (item?.kind !== 'address-entry') {
      return;
    }

    expect(
      shouldShowResolvedAddressFields(
        {
          ...item.group,
          config: { ...item.group.config, manualEntry: false },
        },
        {},
        { manualEntryActive: false, lookupFailed: true },
      ),
    ).toBe(false);
  });

  it('clears only derived address answers when lookup input changes', () => {
    const items = buildAddressEntryRenderItems([
      field('address', 'dn_address', 'address', addressRaw),
      field('postalcode', 'dn_postalcode'),
      field('houseno', 'dn_houseno'),
      field('housenoadd', 'dn_housenoadd'),
      field('street', 'dn_street'),
      field('city', 'dn_city'),
    ]);
    const item = items[0];
    expect(item?.kind).toBe('address-entry');
    if (item?.kind !== 'address-entry') {
      return;
    }

    expect(buildClearedAddressEntryAnswers(item.group)).toEqual({
      dn_address: { value: '', displayValue: '' },
      dn_street: { value: '', displayValue: '' },
      dn_city: { value: '', displayValue: '' },
    });
  });

  it('keeps the compact marker postcode when clearing derived address answers', () => {
    const markerRaw: ServiceFormField['raw'] = {
      address_group: {
        id: 'dn_postalcode',
        fields: {
          postalCode: 'dn_postalcode',
          houseNumber: 'dn_houseno',
          addition: 'dn_addition',
          street: 'dn_street',
          city: 'dn_city',
        },
        confirmAddress: true,
        allowManual: true,
        allowForeignManual: false,
      },
    };
    const groupItem = buildAddressEntryRenderItems([
      field('postalcode', 'dn_postalcode', 'string', markerRaw),
      field('houseno', 'dn_houseno'),
      field('addition', 'dn_addition'),
      field('street', 'dn_street'),
      field('city', 'dn_city'),
    ])[0];

    expect(groupItem?.kind).toBe('address-entry');
    if (groupItem?.kind === 'address-entry') {
      expect(buildClearedAddressEntryAnswers(groupItem.group)).toEqual({
        dn_street: { value: '', displayValue: '' },
        dn_city: { value: '', displayValue: '' },
      });
    }
  });

  it('keeps all fields separate when a required mapping is missing', () => {
    const incompleteRaw = {
      ...addressRaw,
      address_components: {
        postalcode: 'dn_postalcode',
        houseno: 'dn_houseno',
        street: 'dn_street',
      },
    };
    const fields = [
      field('address', 'dn_address', 'address', incompleteRaw),
      field('postalcode', 'dn_postalcode'),
      field('houseno', 'dn_houseno'),
      field('street', 'dn_street'),
    ];

    expect(buildAddressEntryRenderItems(fields)).toEqual(
      fields.map((item) => ({ kind: 'field', field: item })),
    );
  });
});

const compactGroupFrom = (): AddressEntryGroup => {
  const markerRaw: ServiceFormField['raw'] = {
    address_group: {
      id: 'dn_postalcode',
      fields: {
        postalCode: 'dn_postalcode',
        houseNumber: 'dn_houseno',
        addition: 'dn_addition',
        street: 'dn_street',
        city: 'dn_city',
        country: 'dn_country',
      },
      confirmAddress: true,
      allowManual: true,
      allowForeignManual: true,
    },
  };
  const item = buildAddressEntryRenderItems([
    field('postalcode', 'dn_postalcode', 'string', markerRaw),
    field('houseno', 'dn_houseno'),
    field('addition', 'dn_addition'),
    field('street', 'dn_street'),
    field('city', 'dn_city'),
    field('country', 'dn_country'),
  ])[0];
  if (item?.kind !== 'address-entry') {
    throw new Error('expected compact address group');
  }
  return item.group;
};

describe('compact address UI decisions', () => {
  it('starts compact postal lookup only after an explicit find-address request', () => {
    const base = {
      readOnly: false,
      foreignLocationActive: false,
      postcodeHouseNumberLookup: true,
      hasLookupCapability: true,
      lookupReady: true,
      isCompactAddressGroup: true,
      lookupKey: '1234 AB|12|',
      hasResolvedAnswers: false,
      manualEntryActive: false,
    };

    expect(isPostalAddressLookupQueryEnabled({ ...base, requestedLookupKey: null })).toBe(false);
    expect(
      isPostalAddressLookupQueryEnabled({
        ...base,
        requestedLookupKey: '1234 AB|12|',
      }),
    ).toBe(true);
    expect(
      isPostalAddressLookupQueryEnabled({
        ...base,
        requestedLookupKey: '1234 AB|12|',
        foreignLocationActive: true,
      }),
    ).toBe(false);
    expect(
      isPostalAddressLookupQueryEnabled({
        ...base,
        requestedLookupKey: '1234 AB|12|',
        hasResolvedAnswers: true,
      }),
    ).toBe(false);
  });

  it('offers foreign location only for compact lookup mode', () => {
    const group = compactGroupFrom();
    expect(shouldOfferForeignLocationEntry(group, false)).toBe(true);
    expect(shouldOfferForeignLocationEntry(group, true)).toBe(false);

    const nonCompact = buildAddressEntryRenderItems([
      field('address', 'dn_address', 'address', addressRaw),
      field('postalcode', 'dn_postalcode'),
      field('houseno', 'dn_houseno'),
      field('street', 'dn_street'),
      field('city', 'dn_city'),
    ])[0];
    expect(nonCompact?.kind).toBe('address-entry');
    if (nonCompact?.kind === 'address-entry') {
      expect(shouldOfferForeignLocationEntry(nonCompact.group, false)).toBe(false);
      expect(shouldOfferNonCompactManualEntry(nonCompact.group)).toBe(true);
      expect(shouldOfferNonCompactManualEntry(group)).toBe(false);
    }
  });

  it('shows a summary after apply and hides it in foreign-location mode', () => {
    const group = compactGroupFrom();
    const answers = {
      dn_street: { value: 'Dorpsstraat', displayValue: 'Dorpsstraat' },
      dn_houseno: { value: '12', displayValue: '12' },
      dn_postalcode: { value: '1234 AB', displayValue: '1234 AB' },
      dn_city: { value: 'Voorbeeld', displayValue: 'Voorbeeld' },
    };

    expect(hasResolvedAddressComponentAnswers(group, answers)).toBe(true);
    expect(
      resolveCompactAddressSummaryDisplay(group, answers, {
        foreignLocationActive: false,
        appliedAddressSummary: null,
      }),
    ).toBe('Dorpsstraat 12, 1234 AB Voorbeeld');
    expect(
      resolveCompactAddressSummaryDisplay(group, answers, {
        foreignLocationActive: false,
        appliedAddressSummary: 'Dorpsstraat 12, 1234 AB Voorbeeld, Nederland',
      }),
    ).toBe('Dorpsstraat 12, 1234 AB Voorbeeld, Nederland');
    expect(
      resolveCompactAddressSummaryDisplay(group, answers, {
        foreignLocationActive: true,
        appliedAddressSummary: 'Dorpsstraat 12, 1234 AB Voorbeeld, Nederland',
      }),
    ).toBeNull();
  });

  it('hides find-address once a summary or resolved answers exist', () => {
    expect(
      shouldShowCompactLookupAction({
        hasResolvedAnswers: false,
        appliedAddressSummary: null,
      }),
    ).toBe(true);
    expect(
      shouldShowCompactLookupAction({
        hasResolvedAnswers: true,
        appliedAddressSummary: null,
      }),
    ).toBe(false);
    expect(
      shouldShowCompactLookupAction({
        hasResolvedAnswers: false,
        appliedAddressSummary: 'Dorpsstraat 12, 1234 AB Voorbeeld',
      }),
    ).toBe(false);
    expect(
      isCompactLookupActionDisabled({
        lookupReady: true,
        hasLookupCapability: true,
        isFetching: false,
      }),
    ).toBe(false);
    expect(
      isCompactLookupActionDisabled({
        lookupReady: false,
        hasLookupCapability: true,
        isFetching: false,
      }),
    ).toBe(true);
  });

  it('shows every field in foreign mode and only lookup fields in quick-search mode', () => {
    const group = compactGroupFrom();
    expect(visibleCompactAddressFields(group, false).map((item) => item.key)).toEqual([
      'dn_postalcode',
      'dn_houseno',
      'dn_addition',
    ]);
    expect(visibleCompactAddressFields(group, true).map((item) => item.key)).toEqual([
      'dn_postalcode',
      'dn_houseno',
      'dn_addition',
      'dn_street',
      'dn_city',
      'dn_country',
    ]);
  });

  it('returning to quick search clears derived answers while keeping postal input', () => {
    const group = compactGroupFrom();
    expect(buildClearedAddressEntryAnswers(group)).toEqual({
      dn_street: { value: '', displayValue: '' },
      dn_city: { value: '', displayValue: '' },
      dn_country: { value: '', displayValue: '' },
    });
  });
});
