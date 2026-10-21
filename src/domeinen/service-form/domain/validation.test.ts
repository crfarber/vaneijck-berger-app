import { describe, expect, it } from 'vitest';
import {
  isSignatureSkippable,
  validateServiceFormField,
  validateVisibleServiceForm,
} from './validation';
import type { ServiceFormField } from './types';

const createField = (overrides: Partial<ServiceFormField> = {}): ServiceFormField => ({
  id: 'field-id',
  key: 'dn_field',
  label: 'Veld',
  type: 'select',
  table: 'dn_country',
  readOnly: false,
  optional: false,
  autocomplete: true,
  validations: [],
  raw: {},
  ...overrides,
});

describe('validateServiceFormField', () => {
  it('requires an empty editable field', () => {
    expect(validateServiceFormField(createField(), {})).toEqual({
      code: 'required',
      message: 'Dit veld is verplicht.',
    });
  });

  it('allows an empty optional field', () => {
    expect(validateServiceFormField(createField({ optional: true }), {})).toBeNull();
  });

  it('requires an optional field with a runtime override', () => {
    const field = createField({ key: '_dn_vehicletypeid_value', optional: true });

    expect(validateServiceFormField(field, {}, { _dn_vehicletypeid_value: true })).toEqual({
      code: 'required',
      message: 'Dit veld is verplicht.',
    });
  });

  it('does not validate readonly information', () => {
    expect(validateServiceFormField(createField({ readOnly: true }), {})).toBeNull();
  });

  it('reports the configured bound so the screen can translate the message', () => {
    const text = createField({
      type: 'string',
      validations: [{ validation_type: 'max-len', value: '3' }],
    });
    const number = createField({
      type: 'number',
      validations: [
        { validation_type: 'min-int', value: 2 },
        { validation_type: 'max-int', value: 5 },
      ],
    });
    const answer = (value: string) => ({ dn_field: { value, displayValue: value } });

    expect(validateServiceFormField(text, answer('abcd'))).toMatchObject({
      code: 'max-length',
      limit: 3,
    });
    expect(validateServiceFormField(number, answer('1'))).toMatchObject({
      code: 'min-value',
      limit: 2,
    });
    expect(validateServiceFormField(number, answer('6'))).toMatchObject({
      code: 'max-value',
      limit: 5,
    });
    expect(validateServiceFormField(number, answer('4'))).toBeNull();
  });

  it('reports only the visible fields that fail, keyed by field', () => {
    const shown = createField({ id: 'shown', key: 'dn_shown' });
    const hidden = createField({ id: 'hidden', key: 'dn_hidden' });
    const filled = createField({ id: 'filled', key: 'dn_filled' });

    expect(
      validateVisibleServiceForm([shown, hidden, filled], new Set(['shown', 'filled']), {
        dn_filled: { value: 'nl', displayValue: 'Nederland' },
      }),
    ).toEqual({ dn_shown: { code: 'required', message: 'Dit veld is verplicht.' } });
  });

  it('ignores a validation without a usable bound', () => {
    const field = createField({
      type: 'string',
      validations: [{ validation_type: 'max-len', value: 'veel' }],
    });

    expect(
      validateServiceFormField(field, { dn_field: { value: 'abcd', displayValue: 'abcd' } }),
    ).toBeNull();
  });

  it('requires signature name and email after ink is present', () => {
    const field = createField({
      id: 'sig',
      key: 'signature_receiver',
      type: 'signature',
      raw: { subFields: { name: {}, email: {} } },
    });
    const withInk = {
      signature_receiver: {
        value: 'data:image/jpeg;base64,abc',
        displayValue: 'Handtekening',
        signatureName: '',
        email: '',
      },
    };

    expect(validateServiceFormField(field, withInk)).toMatchObject({
      code: 'signature-name-required',
    });
    expect(
      validateServiceFormField(field, {
        signature_receiver: { ...withInk.signature_receiver, signatureName: 'Jan' },
      }),
    ).toMatchObject({ code: 'signature-email-required' });
    expect(
      validateServiceFormField(field, {
        signature_receiver: {
          ...withInk.signature_receiver,
          signatureName: 'Jan',
          email: 'jan@example.com',
        },
      }),
    ).toBeNull();
  });

  it('allows skipping a signature only while requiredwhen is not met', () => {
    const field = createField({
      id: 'sig',
      key: 'signature_sender',
      type: 'signature',
      requiredWhen: { field: 'dn_driverstatecode', value: true },
      raw: { subFields: { name: {}, email: {} } },
    });
    const driverPresent = {
      dn_driverstatecode: { value: true, displayValue: 'Ja', table: 'dn_truefalse' },
    };
    const driverAbsent = {
      dn_driverstatecode: { value: false, displayValue: 'Nee', table: 'dn_truefalse' },
    };

    expect(isSignatureSkippable(field, driverAbsent)).toBe(true);
    expect(isSignatureSkippable(field, driverPresent)).toBe(false);
    expect(isSignatureSkippable(field, {})).toBe(true);

    expect(
      validateServiceFormField(field, driverAbsent, {}, { signature_sender: true }),
    ).toBeNull();
    expect(
      validateServiceFormField(field, driverPresent, {}, { signature_sender: true }),
    ).toMatchObject({ code: 'required' });
  });
});
