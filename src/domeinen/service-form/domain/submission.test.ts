import { describe, expect, it } from 'vitest';
import {
  buildServicePostBody,
  buildSignaturePostData,
  coerceBooleanSelectSubmissionValue,
  coerceFieldValue,
  isAnswerEmpty,
  isSignatureKey,
  resolveSignatureAbsentFlags,
} from './submission';
import type { ServiceFormAnswers, ServiceFormField } from './types';

const PLEASE_SELECT = 'Selecteer';

const makeField = (overrides: Partial<ServiceFormField>): ServiceFormField => ({
  id: overrides.key ?? 'field-id',
  key: 'dn_field',
  label: 'Field',
  type: 'string',
  readOnly: false,
  optional: true,
  autocomplete: false,
  validations: [],
  raw: {},
  ...overrides,
});

describe('isSignatureKey', () => {
  it('recognizes the 5 fixed signature keys', () => {
    expect(isSignatureKey('signature_sender')).toBe(true);
    expect(isSignatureKey('signature_executor')).toBe(true);
    expect(isSignatureKey('signature_receiver')).toBe(true);
    expect(isSignatureKey('signature_tower')).toBe(true);
    expect(isSignatureKey('signature_addressee')).toBe(true);
  });

  it('rejects any other field key', () => {
    expect(isSignatureKey('dn_ekv')).toBe(false);
    expect(isSignatureKey('images_damage')).toBe(false);
  });
});

describe('isAnswerEmpty', () => {
  it('treats missing answers as empty', () => {
    expect(isAnswerEmpty(undefined, PLEASE_SELECT)).toBe(true);
  });

  it('treats the please-select placeholder as empty', () => {
    expect(isAnswerEmpty({ value: '', displayValue: PLEASE_SELECT }, PLEASE_SELECT)).toBe(true);
  });

  it('treats blank/null/undefined displayValue as empty', () => {
    expect(isAnswerEmpty({ value: '', displayValue: '' }, PLEASE_SELECT)).toBe(true);
    expect(isAnswerEmpty({ value: '', displayValue: null }, PLEASE_SELECT)).toBe(true);
  });

  it('treats a real answer as non-empty', () => {
    expect(isAnswerEmpty({ value: 'x', displayValue: 'x' }, PLEASE_SELECT)).toBe(false);
  });
});

describe('coerceFieldValue', () => {
  it('always sends dn_numberofkilometers as a Number of the display value', () => {
    const field = makeField({ key: 'dn_numberofkilometers', type: 'number' });
    expect(coerceFieldValue(field, { value: '42', displayValue: '42' })).toBe(42);
  });

  it('uses the raw value when displayValue matches value (non-select)', () => {
    const field = makeField({ key: 'dn_string', type: 'string' });
    expect(coerceFieldValue(field, { value: 'abc', displayValue: 'abc' })).toBe('abc');
  });

  it('coerces displayValue to a Number when value looks like a numeric string', () => {
    const field = makeField({ key: 'dn_string', type: 'string' });
    expect(coerceFieldValue(field, { value: '123', displayValue: '45.6' })).toBe(45.6);
  });

  it('falls back to the display value when value is non-numeric and differs', () => {
    const field = makeField({ key: 'dn_string', type: 'string' });
    expect(coerceFieldValue(field, { value: 'guid-1', displayValue: 'Nissan' })).toBe('Nissan');
  });

  it('always sends the raw value for select fields', () => {
    const field = makeField({ key: 'dn_select', type: 'select' });
    expect(coerceFieldValue(field, { value: 'option-id', displayValue: 'Option label' })).toBe(
      'option-id',
    );
  });

  it('coerces to Number for decimal fields with no value set', () => {
    const field = makeField({ key: 'dn_decimal', type: 'decimal' });
    expect(coerceFieldValue(field, { value: '', displayValue: '12.50' })).toBe(12.5);
  });

  it('sends the display value as-is for non-decimal fields with no value set', () => {
    const field = makeField({ key: 'dn_textarea', type: 'textarea' });
    expect(coerceFieldValue(field, { value: '', displayValue: 'Some notes' })).toBe('Some notes');
  });

  it('treats explicit false/0 values as "has a value"', () => {
    const field = makeField({ key: 'dn_bool', type: 'select', table: 'dn_truefalse' });
    expect(coerceFieldValue(field, { value: false, displayValue: false })).toBe(false);
    expect(coerceFieldValue(field, { value: 0, displayValue: 0 })).toBe(0);
  });

  it('coerces stale boolean answers for dn_optionalyesno selects', () => {
    const field = makeField({
      key: 'dn_keyavailablecode',
      type: 'select',
      table: 'dn_optionalyesno',
    });
    expect(coerceFieldValue(field, { value: true, displayValue: 'Ja' })).toBe(1);
    expect(coerceFieldValue(field, { value: false, displayValue: 'Nee' })).toBe(0);
  });
});

describe('coerceBooleanSelectSubmissionValue', () => {
  it('keeps booleans for dn_truefalse', () => {
    const field = makeField({ table: 'dn_truefalse', type: 'select' });
    expect(coerceBooleanSelectSubmissionValue(field, true)).toBe(true);
  });

  it('maps booleans to integers for dn_optionalyesno', () => {
    const field = makeField({ table: 'dn_optionalyesno', type: 'select' });
    expect(coerceBooleanSelectSubmissionValue(field, true)).toBe(1);
    expect(coerceBooleanSelectSubmissionValue(field, false)).toBe(0);
  });
});

describe('resolveSignatureAbsentFlags', () => {
  it('sets sender absent flags when signature_sender is hidden', () => {
    expect(resolveSignatureAbsentFlags({ signature_sender: true }, {})).toEqual({
      dn_absent_sender: 1,
      dn_absent_senderemailaddress: 1,
    });
  });

  it('sets only the sender email flag when just the email was skipped', () => {
    expect(resolveSignatureAbsentFlags({}, { signature_sender: true })).toEqual({
      dn_absent_senderemailaddress: 1,
    });
  });

  it('sets receiver absent flags when signature_receiver is hidden', () => {
    expect(resolveSignatureAbsentFlags({ signature_receiver: true }, {})).toEqual({
      dn_absent_receiver: 1,
      dn_absent_receiveremailaddress: 1,
    });
  });

  it('sets receiver absent flags when signature_addressee is hidden', () => {
    expect(resolveSignatureAbsentFlags({ signature_addressee: true }, {})).toEqual({
      dn_absent_receiver: 1,
      dn_absent_receiveremailaddress: 1,
    });
  });

  it('has no absent-flag equivalent for executor/tower', () => {
    expect(
      resolveSignatureAbsentFlags({ signature_executor: true, signature_tower: true }, {}),
    ).toEqual({});
  });

  it('returns an empty object when nothing is hidden or skipped', () => {
    expect(resolveSignatureAbsentFlags({}, {})).toEqual({});
  });
});

describe('buildServicePostBody', () => {
  const options = { pleaseSelectLabel: PLEASE_SELECT, hideSignature: {}, noEmailConfirmation: {} };

  it('maps phase 1 to HULPVERLENING_AKKOORD and phase 2 to HULPVERLENING_AFGEROND', () => {
    const fields: ServiceFormField[] = [];
    expect(buildServicePostBody(fields, new Set(), {}, 1, options)).toMatchObject({
      statuscode: 875920004,
      statecode: 0,
    });
    expect(buildServicePostBody(fields, new Set(), {}, 2, options)).toMatchObject({
      statuscode: 875920005,
      statecode: 0,
    });
  });

  it('excludes readOnly fields', () => {
    const field = makeField({ id: 'f1', key: 'dn_readonly', readOnly: true });
    const answers: ServiceFormAnswers = { dn_readonly: { value: 'x', displayValue: 'x' } };
    const body = buildServicePostBody([field], new Set(['f1']), answers, 1, options);
    expect(body).not.toHaveProperty('dn_readonly');
  });

  it('excludes fields that are not visible', () => {
    const field = makeField({ id: 'f1', key: 'dn_hidden' });
    const answers: ServiceFormAnswers = { dn_hidden: { value: 'x', displayValue: 'x' } };
    const body = buildServicePostBody([field], new Set(), answers, 1, options);
    expect(body).not.toHaveProperty('dn_hidden');
  });

  it('excludes empty answers', () => {
    const field = makeField({ id: 'f1', key: 'dn_empty' });
    const body = buildServicePostBody([field], new Set(['f1']), {}, 1, options);
    expect(body).not.toHaveProperty('dn_empty');
  });

  it('excludes signature-type fields (routed to signature payload instead)', () => {
    const field = makeField({ id: 'f1', key: 'signature_sender', type: 'signature' });
    const answers: ServiceFormAnswers = {
      signature_sender: {
        value: 'data:image/png;base64,xxx',
        displayValue: 'data:image/png;base64,xxx',
      },
    };
    const body = buildServicePostBody([field], new Set(['f1']), answers, 1, options);
    expect(body).not.toHaveProperty('signature_sender');
  });

  it('includes a coerced answer for a normal visible field', () => {
    const field = makeField({ id: 'f1', key: 'dn_note', type: 'textarea' });
    const answers: ServiceFormAnswers = { dn_note: { value: '', displayValue: 'hello' } };
    const body = buildServicePostBody([field], new Set(['f1']), answers, 1, options);
    expect(body.dn_note).toBe('hello');
  });

  it('folds in signature absent-flags from hideSignature/noEmailConfirmation', () => {
    const body = buildServicePostBody([], new Set(), {}, 1, {
      ...options,
      hideSignature: { signature_sender: true },
    });
    expect(body).toMatchObject({ dn_absent_sender: 1, dn_absent_senderemailaddress: 1 });
  });
});

describe('buildSignaturePostData', () => {
  it('includes phase always', () => {
    expect(buildSignaturePostData([], new Set(), {}, {}, {}, 2)).toEqual({ phase: 2 });
  });

  it('includes image, name and email for a captured, non-hidden signature', () => {
    const field = makeField({ id: 'f1', key: 'signature_sender', type: 'signature' });
    const answers: ServiceFormAnswers = {
      signature_sender: {
        value: 'uri://sig.png',
        displayValue: 'uri://sig.png',
        signatureName: 'Jan Jansen',
        email: 'jan@example.com',
      },
    };
    const result = buildSignaturePostData([field], new Set(['f1']), answers, {}, {}, 1);
    expect(result).toEqual({
      phase: 1,
      signature_sender: 'uri://sig.png',
      signature_sender_name: 'Jan Jansen',
      signature_sender_email: 'jan@example.com',
    });
  });

  it('omits a signature entirely when hidden via "not available"', () => {
    const field = makeField({ id: 'f1', key: 'signature_sender', type: 'signature' });
    const answers: ServiceFormAnswers = {
      signature_sender: {
        value: 'uri://sig.png',
        displayValue: 'uri://sig.png',
        signatureName: 'Jan Jansen',
        email: 'jan@example.com',
      },
    };
    const result = buildSignaturePostData(
      [field],
      new Set(['f1']),
      answers,
      { signature_sender: true },
      {},
      1,
    );
    expect(result).toEqual({ phase: 1 });
  });

  it('omits only the email when the email confirmation was skipped', () => {
    const field = makeField({ id: 'f1', key: 'signature_sender', type: 'signature' });
    const answers: ServiceFormAnswers = {
      signature_sender: {
        value: 'uri://sig.png',
        displayValue: 'uri://sig.png',
        signatureName: 'Jan Jansen',
        email: 'jan@example.com',
      },
    };
    const result = buildSignaturePostData(
      [field],
      new Set(['f1']),
      answers,
      {},
      { signature_sender: true },
      1,
    );
    expect(result).toEqual({
      phase: 1,
      signature_sender: 'uri://sig.png',
      signature_sender_name: 'Jan Jansen',
    });
  });

  it('skips a signature field with no captured image yet', () => {
    const field = makeField({ id: 'f1', key: 'signature_sender', type: 'signature' });
    const answers: ServiceFormAnswers = { signature_sender: { value: '', displayValue: '' } };
    const result = buildSignaturePostData([field], new Set(['f1']), answers, {}, {}, 1);
    expect(result).toEqual({ phase: 1 });
  });

  it('skips non-signature fields entirely', () => {
    const field = makeField({ id: 'f1', key: 'dn_ekv', type: 'select' });
    const answers: ServiceFormAnswers = { dn_ekv: { value: true, displayValue: 'Ja' } };
    const result = buildSignaturePostData([field], new Set(['f1']), answers, {}, {}, 1);
    expect(result).toEqual({ phase: 1 });
  });
});
