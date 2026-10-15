import { describe, expect, it } from 'vitest';
import { fieldsForGroupAnswersDebug, pickGroupAnswersForDebug } from './group-answers-debug';
import type { ServiceFormField } from './types';

const field = (key: string, label: string): ServiceFormField => ({
  id: key,
  key,
  label,
  type: 'string',
  readOnly: false,
  optional: false,
  autocomplete: false,
  validations: [],
  raw: {},
});

describe('fieldsForGroupAnswersDebug', () => {
  it('deduplicates by key, appends the CRM key to the label, and sorts', () => {
    expect(
      fieldsForGroupAnswersDebug([
        field('dn_b', 'Plaats'),
        field('dn_a', 'Straat'),
        field('dn_b', 'Plaats opnieuw'),
        field('  ', 'Leeg'),
      ]).map((item) => ({ key: item.key, label: item.label })),
    ).toEqual([
      { key: 'dn_a', label: 'Straat (dn_a)' },
      { key: 'dn_b', label: 'Plaats (dn_b)' },
    ]);
  });

  it('falls back to the CRM key when the label is blank', () => {
    expect(fieldsForGroupAnswersDebug([field('dn_x', '  ')])[0]?.label).toBe('dn_x');
  });
});

describe('pickGroupAnswersForDebug', () => {
  it('returns answers for the listed keys and empty stubs for missing ones', () => {
    expect(
      pickGroupAnswersForDebug(
        {
          dn_driverpostalcode: { value: '1234AB', displayValue: '1234AB' },
          dn_driverstreet: { value: 'Kerkstraat', displayValue: 'Kerkstraat' },
        },
        ['dn_driverpostalcode', 'dn_driverhouseno', 'dn_driverstreet'],
      ),
    ).toEqual({
      dn_driverpostalcode: { value: '1234AB', displayValue: '1234AB' },
      dn_driverhouseno: { value: '', displayValue: '' },
      dn_driverstreet: { value: 'Kerkstraat', displayValue: 'Kerkstraat' },
    });
  });

  it('deduplicates keys and ignores blanks', () => {
    expect(
      pickGroupAnswersForDebug({ a: { value: 1, displayValue: '1' } }, ['a', 'a', '', '  ']),
    ).toEqual({ a: { value: 1, displayValue: '1' } });
  });
});
