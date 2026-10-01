import { describe, expect, it } from 'vitest';
import { answersAfterParentChange } from './answer-updates';
import type { ServiceFormField } from './types';

const PLEASE_SELECT = 'Selecteer';

const brand: ServiceFormField = {
  id: 'brand',
  key: '_dn_vehiclebrandid_value',
  label: 'Merk',
  type: 'select',
  table: 'dn_vehiclebrands',
  readOnly: false,
  optional: false,
  autocomplete: true,
  validations: [],
  raw: {},
};

const vehicleType: ServiceFormField = {
  id: 'type',
  key: '_dn_vehicletypeid_value',
  label: 'Type',
  type: 'select',
  table: 'dn_vehicletypes',
  readOnly: false,
  optional: false,
  autocomplete: true,
  dependencies: { required: '_dn_vehiclebrandid_value' },
  validations: [],
  raw: {},
};

const notes: ServiceFormField = {
  id: 'notes',
  key: 'dn_notes',
  label: 'Notities',
  type: 'string',
  readOnly: false,
  optional: true,
  autocomplete: false,
  validations: [],
  raw: {},
};

describe('answersAfterParentChange', () => {
  it('clears dependents when the parent value changes', () => {
    const answers = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      _dn_vehicletypeid_value: { value: 't-1', displayValue: 'Golf', table: 'dn_vehicletypes' },
      dn_notes: { value: 'keep', displayValue: 'keep' },
    };

    expect(
      answersAfterParentChange(
        [brand, vehicleType, notes],
        answers,
        '_dn_vehiclebrandid_value',
        { value: 'opel', displayValue: 'Opel' },
        PLEASE_SELECT,
      ),
    ).toEqual({
      _dn_vehiclebrandid_value: { value: 'opel', displayValue: 'Opel' },
      _dn_vehicletypeid_value: {
        value: '',
        displayValue: PLEASE_SELECT,
        table: 'dn_vehicletypes',
      },
    });
  });

  it('does not clear dependents when the parent value stays the same', () => {
    const answers = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      _dn_vehicletypeid_value: { value: 't-1', displayValue: 'Golf' },
    };

    expect(
      answersAfterParentChange(
        [brand, vehicleType],
        answers,
        '_dn_vehiclebrandid_value',
        { value: 'vw', displayValue: 'Volkswagen AG' },
        PLEASE_SELECT,
      ),
    ).toEqual({
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen AG' },
    });
  });

  it('returns only the parent update when no field depends on it', () => {
    expect(
      answersAfterParentChange(
        [brand, notes],
        { dn_notes: { value: 'x', displayValue: 'x' } },
        'dn_notes',
        { value: 'y', displayValue: 'y' },
        PLEASE_SELECT,
      ),
    ).toEqual({
      dn_notes: { value: 'y', displayValue: 'y' },
    });
  });
});
