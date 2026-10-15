import { describe, expect, it } from 'vitest';
import { buildSectionReset, isSectionDirty, selectDirtyResetSections } from './section-reset';
import type { ServiceFormField, ServiceFormSection } from './types';

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

const vehicleSection: ServiceFormSection = {
  id: 'vehicle',
  title: 'Voertuig',
  fields: [brand],
  contractRights: [],
};

const notesSection: ServiceFormSection = {
  id: 'notes',
  title: 'Overig',
  fields: [notes],
  contractRights: [],
};

const typeSection: ServiceFormSection = {
  id: 'type',
  title: 'Type',
  fields: [vehicleType],
  contractRights: [],
};

describe('isSectionDirty / selectDirtyResetSections', () => {
  it('is clean when section answers match the CRM baseline', () => {
    const answers = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      dn_notes: { value: 'keep', displayValue: 'keep' },
    };
    expect(isSectionDirty(vehicleSection, answers, answers)).toBe(false);
    expect(selectDirtyResetSections([vehicleSection, notesSection], answers, answers)).toEqual([]);
  });

  it('lists only sections whose fields changed, in form order', () => {
    const initial = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      dn_notes: { value: 'A', displayValue: 'A' },
    };
    const current = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      dn_notes: { value: 'B', displayValue: 'B' },
    };
    expect(isSectionDirty(vehicleSection, initial, current)).toBe(false);
    expect(isSectionDirty(notesSection, initial, current)).toBe(true);
    expect(selectDirtyResetSections([vehicleSection, notesSection], initial, current)).toEqual([
      notesSection,
    ]);
  });

  it('treats a key only present in answers as dirty for that section', () => {
    const initial = {};
    const current = {
      dn_notes: { value: 'typed', displayValue: 'typed' },
    };
    expect(isSectionDirty(notesSection, initial, current)).toBe(true);
  });
});

describe('buildSectionReset', () => {
  it('restores section fields to the baseline and leaves other sections intact', () => {
    const initial = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      dn_notes: { value: 'A', displayValue: 'A' },
    };
    const current = {
      _dn_vehiclebrandid_value: { value: 'opel', displayValue: 'Opel' },
      dn_notes: { value: 'B', displayValue: 'B' },
    };

    const result = buildSectionReset(
      vehicleSection,
      [brand, vehicleType, notes],
      initial,
      current,
      PLEASE_SELECT,
    );

    expect(result.answers).toEqual({
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      dn_notes: { value: 'B', displayValue: 'B' },
    });
    expect(result.fieldKeys).toEqual(['_dn_vehiclebrandid_value']);
  });

  it('drops a section answer that was not in the CRM baseline', () => {
    const result = buildSectionReset(
      notesSection,
      [notes],
      {},
      { dn_notes: { value: 'typed', displayValue: 'typed' } },
      PLEASE_SELECT,
    );

    expect(result.answers.dn_notes).toBeUndefined();
    expect(result.fieldKeys).toEqual(['dn_notes']);
  });

  it('clears dependents outside the section when a restored parent value changes', () => {
    const initial = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
    };
    const current = {
      _dn_vehiclebrandid_value: { value: 'opel', displayValue: 'Opel' },
      _dn_vehicletypeid_value: {
        value: 't-1',
        displayValue: 'Golf',
        table: 'dn_vehicletypes',
      },
    };

    const result = buildSectionReset(
      vehicleSection,
      [brand, vehicleType, notes],
      initial,
      current,
      PLEASE_SELECT,
    );

    expect(result.answers._dn_vehiclebrandid_value).toEqual({
      value: 'vw',
      displayValue: 'Volkswagen',
    });
    expect(result.answers._dn_vehicletypeid_value).toEqual({
      value: '',
      displayValue: PLEASE_SELECT,
      table: 'dn_vehicletypes',
    });
    expect(result.fieldKeys).toEqual(['_dn_vehiclebrandid_value', '_dn_vehicletypeid_value']);
  });

  it('does not clear an out-of-section dependent when the parent value is unchanged', () => {
    const answers = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      _dn_vehicletypeid_value: { value: 't-1', displayValue: 'Golf' },
    };

    const result = buildSectionReset(
      vehicleSection,
      [brand, vehicleType],
      answers,
      answers,
      PLEASE_SELECT,
    );

    expect(result.answers._dn_vehicletypeid_value).toEqual({
      value: 't-1',
      displayValue: 'Golf',
    });
    expect(result.fieldKeys).toEqual(['_dn_vehiclebrandid_value']);
  });

  it('does not overwrite a dependent that already lives inside the reset section', () => {
    const sectionWithBoth: ServiceFormSection = {
      id: 'vehicle-full',
      title: 'Voertuig',
      fields: [brand, vehicleType],
      contractRights: [],
    };
    const initial = {
      _dn_vehiclebrandid_value: { value: 'vw', displayValue: 'Volkswagen' },
      _dn_vehicletypeid_value: { value: 't-1', displayValue: 'Golf' },
    };
    const current = {
      _dn_vehiclebrandid_value: { value: 'opel', displayValue: 'Opel' },
      _dn_vehicletypeid_value: { value: 't-2', displayValue: 'Astra' },
    };

    const result = buildSectionReset(
      sectionWithBoth,
      [brand, vehicleType],
      initial,
      current,
      PLEASE_SELECT,
    );

    expect(result.answers._dn_vehicletypeid_value).toEqual({
      value: 't-1',
      displayValue: 'Golf',
    });
  });

  it('keeps type-section answers when only notes are reset', () => {
    const initial = {
      dn_notes: { value: 'A', displayValue: 'A' },
      _dn_vehicletypeid_value: { value: 't-1', displayValue: 'Golf' },
    };
    const current = {
      dn_notes: { value: 'B', displayValue: 'B' },
      _dn_vehicletypeid_value: { value: 't-1', displayValue: 'Golf' },
    };

    const result = buildSectionReset(
      notesSection,
      [brand, vehicleType, notes],
      initial,
      current,
      PLEASE_SELECT,
    );

    expect(result.answers).toEqual(initial);
    expect(typeSection.fields[0]?.key).toBe('_dn_vehicletypeid_value');
  });
});
