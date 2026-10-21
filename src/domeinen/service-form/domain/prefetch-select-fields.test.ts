import { describe, expect, it } from 'vitest';
import {
  isPrefetchableSelectField,
  selectPrefetchableSelectFields,
} from './prefetch-select-fields';
import type { NormalizedServiceForm, ServiceFormField } from './types';

const baseField = {
  id: 'f',
  key: 'dn_field',
  label: 'Veld',
  type: 'select',
  readOnly: false,
  optional: false,
  autocomplete: true,
  validations: [],
  raw: {},
} satisfies Omit<ServiceFormField, 'table'>;

const depot: ServiceFormField = {
  ...baseField,
  id: 'depot',
  key: '_dn_locationid_value',
  label: 'Depot',
  table: 'dn_location',
  quickPicks: 3,
  sortOptions: { orderby: 'distance', direction: 'ascending' },
};

const plainSelect: ServiceFormField = {
  ...baseField,
  id: 'brand',
  key: '_dn_vehiclebrandid_value',
  label: 'Merk',
  table: 'dn_vehiclebrands',
};

const vehicleType: ServiceFormField = {
  ...baseField,
  id: 'type',
  key: '_dn_vehicletypeid_value',
  label: 'Type',
  table: 'dn_vehicletypes',
  quickPicks: 3,
  dependencies: { required: '_dn_vehiclebrandid_value' },
};

const distanceOnly: ServiceFormField = {
  ...baseField,
  id: 'loc',
  key: '_dn_otherlocationid_value',
  label: 'Locatie',
  table: 'dn_location',
  sortOptions: { orderby: 'distance', direction: 'ascending' },
};

const form = (fields: ServiceFormField[]): NormalizedServiceForm => ({
  serviceCode: 1004,
  serviceName: 'Berging',
  phase: 1,
  phaseName: 'Start',
  photosMandatory: [],
  sections: [{ id: 'main', title: 'Hoofd', fields, contractRights: [] }],
  diagnostics: [],
  requiresTermsAcceptance: false,
});

describe('isPrefetchableSelectField', () => {
  it('accepts a depot field with distance sort and quick picks', () => {
    expect(isPrefetchableSelectField(depot)).toBe(true);
  });

  it('accepts distance sort without quick picks', () => {
    expect(isPrefetchableSelectField(distanceOnly)).toBe(true);
  });

  it('rejects a plain select without quick picks or distance sort', () => {
    expect(isPrefetchableSelectField(plainSelect)).toBe(false);
  });

  it('rejects fields that need a dependency answer first', () => {
    expect(isPrefetchableSelectField(vehicleType)).toBe(false);
  });

  it('rejects fields without a table', () => {
    expect(isPrefetchableSelectField({ ...baseField, id: 'notes', type: 'string' })).toBe(false);
  });
});

describe('selectPrefetchableSelectFields', () => {
  it('returns only prefetchable fields from the form', () => {
    expect(
      selectPrefetchableSelectFields(form([plainSelect, depot, vehicleType, distanceOnly])).map(
        (field) => field.key,
      ),
    ).toEqual(['_dn_locationid_value', '_dn_otherlocationid_value']);
  });

  it('returns an empty list when nothing qualifies', () => {
    expect(selectPrefetchableSelectFields(form([plainSelect, vehicleType]))).toEqual([]);
  });
});
