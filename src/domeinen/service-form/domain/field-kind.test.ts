import { describe, expect, it } from 'vitest';
import { groupSectionFields, normalizeFieldInput, resolveFieldKind } from './field-kind';
import type { ServiceFormField } from './types';

const field = (overrides: Partial<ServiceFormField> = {}): ServiceFormField => ({
  id: overrides.key ?? 'dn_field',
  key: 'dn_field',
  label: 'Veld',
  type: 'string',
  readOnly: false,
  optional: false,
  autocomplete: false,
  validations: [],
  raw: {},
  ...overrides,
});

describe('resolveFieldKind', () => {
  it('maps the schema types to an input, ignoring case', () => {
    expect(resolveFieldKind(field({ type: 'String' }))).toBe('text');
    expect(resolveFieldKind(field({ type: 'textarea' }))).toBe('textarea');
    expect(resolveFieldKind(field({ type: 'number' }))).toBe('number');
    expect(resolveFieldKind(field({ type: 'decimal' }))).toBe('decimal');
    expect(resolveFieldKind(field({ type: 'date' }))).toBe('date');
    expect(resolveFieldKind(field({ type: 'phonenumber' }))).toBe('phone');
    expect(resolveFieldKind(field({ type: 'phone' }))).toBe('phone');
    expect(resolveFieldKind(field({ type: 'select', table: 'dn_country' }))).toBe('select');
  });

  it('shows true/false and optional yes/no tables as a toggle', () => {
    expect(resolveFieldKind(field({ type: 'select', table: 'dn_truefalse' }))).toBe(
      'boolean-select',
    );
    expect(resolveFieldKind(field({ type: 'select', table: 'dn_optionalyesno' }))).toBe(
      'boolean-select',
    );
  });

  it('marks a type the app cannot show yet instead of guessing an input', () => {
    expect(resolveFieldKind(field({ type: 'address' }))).toBe('address');
    expect(resolveFieldKind(field({ type: 'signature' }))).toBe('signature');
    expect(resolveFieldKind(field({ type: 'hologram' }))).toBe('unsupported');
  });
});

describe('normalizeFieldInput', () => {
  it('stores a decimal typed with a comma with a dot', () => {
    expect(normalizeFieldInput('decimal', '12,5')).toBe('12.5');
  });

  it('keeps other text exactly as typed', () => {
    expect(normalizeFieldInput('text', 'Straat 1, Utrecht')).toBe('Straat 1, Utrecht');
  });
});

describe('groupSectionFields', () => {
  it('collapses consecutive read-only fields into one summary', () => {
    const fields = [
      field({ key: 'a', readOnly: true }),
      field({ key: 'b', readOnly: true }),
      field({ key: 'c' }),
      field({ key: 'd', readOnly: true }),
    ];

    expect(
      groupSectionFields(fields).map((group) =>
        group.kind === 'readonly' ? group.fields.map((item) => item.key) : group.field.key,
      ),
    ).toEqual([['a', 'b'], 'c', ['d']]);
  });

  it('keeps editable fields apart', () => {
    expect(groupSectionFields([field({ key: 'a' }), field({ key: 'b' })])).toHaveLength(2);
  });

  it('puts every field in one read-only group when preview asks for it', () => {
    const fields = [
      field({ key: 'a', readOnly: true }),
      field({ key: 'b' }),
      field({ key: 'c', readOnly: true }),
    ];
    expect(groupSectionFields(fields, { readonly: true })).toEqual([
      { kind: 'readonly', fields: [...fields] },
    ]);
    expect(groupSectionFields([], { readonly: true })).toEqual([]);
  });
});
