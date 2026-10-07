import { describe, expect, it } from 'vitest';
import type { ServiceFormField } from './types';
import {
  buildAddressEntryRenderItems,
  buildAddressEntrySectionRenderItems,
  buildClearedAddressEntryAnswers,
  readAddressEntryConfig,
  shouldShowResolvedAddressFields,
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
