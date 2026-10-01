import { describe, expect, it } from 'vitest';
import {
  buildInitialServiceFormAnswer,
  buildInitialServiceFormAnswers,
  cloneServiceFormAnswers,
  resolveServiceFormValueToShow,
} from './values';
import type { ServiceFormField } from './types';

const booleanField = (overrides: Partial<ServiceFormField> = {}): ServiceFormField => ({
  id: 'field/dn_key',
  key: 'dn_keypresent',
  label: 'Sleutel aanwezig',
  type: 'select',
  table: 'dn_optionalyesno',
  readOnly: false,
  optional: false,
  autocomplete: false,
  validations: [],
  raw: {},
  ...overrides,
});

const textField = (key: string): ServiceFormField => ({
  id: `field/${key}`,
  key,
  label: key,
  type: 'string',
  readOnly: false,
  optional: false,
  autocomplete: false,
  validations: [],
  raw: {},
});

describe('serviceFormValues', () => {
  it('treats boolean selects without formatted CRM label as empty', () => {
    const field = booleanField();
    const answer = buildInitialServiceFormAnswer(field, { dn_keypresent: 1 }, 'Selecteer');

    expect(answer).toEqual({ value: '', displayValue: 'Selecteer', table: 'dn_optionalyesno' });
  });

  it('keeps boolean selects when CRM provides a formatted label', () => {
    const field = booleanField();
    const answer = buildInitialServiceFormAnswer(
      field,
      { dn_keypresent: 1, 'dn_keypresent@OData.Community.Display.V1.FormattedValue': 'Ja' },
      'Selecteer',
    );

    expect(answer).toEqual({ value: 1, displayValue: 'Ja', table: 'dn_optionalyesno' });
  });

  it('uses legacy valueToShow semantics for populated text fields', () => {
    const field = textField('dn_inzetbeperking');
    const answer = buildInitialServiceFormAnswer(field, { dn_inzetbeperking: '-' }, 'Selecteer');

    expect(answer).toEqual({ value: '-', displayValue: '-', table: undefined });
  });

  it('leaves editable text fields empty when CRM has no display value', () => {
    const field = textField('dn_inzetbeperking');
    const answer = buildInitialServiceFormAnswer(field, {}, 'Selecteer');

    expect(answer).toEqual({ value: '', displayValue: '', table: undefined });
  });

  it('resolveServiceFormValueToShow ignores raw ids for boolean selects', () => {
    const field = booleanField();
    expect(resolveServiceFormValueToShow(field, { dn_keypresent: 0 })).toBeUndefined();
  });

  it('buildInitialServiceFormAnswers deduplicates shared answer keys', () => {
    const fields = [textField('dn_shared'), textField('dn_shared')];
    const answers = buildInitialServiceFormAnswers(fields, {}, 'Selecteer');

    expect(Object.keys(answers)).toEqual(['dn_shared']);
  });

  it('cloneServiceFormAnswers creates isolated copies', () => {
    const original = { dn_name: { value: 'A', displayValue: 'A' } };
    const cloned = cloneServiceFormAnswers(original);
    const clonedName = cloned.dn_name;
    expect(clonedName).toBeDefined();
    if (clonedName) {
      clonedName.value = 'B';
    }

    expect(original.dn_name.value).toBe('A');
  });
});
