import { describe, expect, it } from 'vitest';
import {
  isServiceFormDirty,
  selectActiveServiceFormAnswers,
  selectNextIncompleteServiceFormField,
  selectNextVisibleServiceFormField,
  selectQuickViewFields,
  selectQuickViewSections,
  selectServiceFormProgress,
} from './selectors';
import { isServiceFormFieldFilled } from './validation';
import type { ServiceFormField } from './types';

const fields: [ServiceFormField, ServiceFormField] = [
  {
    id: 'controller',
    key: 'dn_controller',
    label: 'Controller',
    type: 'select',
    readOnly: false,
    optional: false,
    autocomplete: true,
    validations: [],
    raw: {},
  },
  {
    id: 'dependent',
    key: 'dn_dependent',
    label: 'Dependent',
    type: 'string',
    readOnly: false,
    optional: false,
    autocomplete: true,
    validations: [],
    raw: {},
  },
];

describe('service form selectors', () => {
  it('omits retained hidden answers from active answers and progress', () => {
    const answers = {
      dn_controller: { value: 1, displayValue: 'Ja' },
      dn_dependent: { value: 'retained', displayValue: 'retained' },
    };
    const visible = new Set(['controller']);

    expect(selectActiveServiceFormAnswers(fields, visible, answers)).toEqual({
      dn_controller: answers.dn_controller,
    });
    expect(selectServiceFormProgress(fields, visible, answers)).toEqual({
      completed: 1,
      total: 1,
      remaining: 0,
    });
  });

  it('returns the first visible required field that is incomplete', () => {
    const answers = {
      dn_controller: { value: '', displayValue: '' },
      dn_dependent: { value: '', displayValue: '' },
    };
    const visible = new Set(['controller', 'dependent']);

    expect(selectNextIncompleteServiceFormField(fields, visible, answers)?.id).toBe('controller');
  });

  it('selects the direct next editable field in screen order instead of JSON order', () => {
    const optionalField: ServiceFormField = {
      ...fields[1],
      id: 'optional',
      key: 'dn_optional',
      optional: true,
    };
    const jsonOrderedFields = [fields[0], fields[1], optionalField];
    const screenLayouts = [
      { fieldId: 'dependent', x: 0, y: 0 },
      { fieldId: 'optional', x: 0, y: 100 },
      { fieldId: 'controller', x: 0, y: 200 },
    ];

    expect(
      selectNextVisibleServiceFormField(jsonOrderedFields, screenLayouts, 'dependent')?.id,
    ).toBe('optional');
  });

  it('starts at the first visible editable field and skips readonly or unrendered fields', () => {
    const readOnlyField: ServiceFormField = {
      ...fields[0],
      id: 'readonly',
      key: 'dn_readonly',
      readOnly: true,
    };

    expect(
      selectNextVisibleServiceFormField(
        [fields[0], readOnlyField, fields[1]],
        [
          { fieldId: 'readonly', x: 0, y: 0 },
          { fieldId: 'dependent', x: 0, y: 100 },
        ],
        null,
      )?.id,
    ).toBe('dependent');
  });

  it('skips display-only and unsupported fields in screen order', () => {
    const dateField: ServiceFormField = {
      ...fields[0],
      id: 'date',
      key: 'dn_date',
      type: 'date',
    };
    const unsupportedField: ServiceFormField = {
      ...fields[0],
      id: 'unsupported',
      key: 'dn_unsupported',
      type: 'unknown',
    };

    expect(
      selectNextVisibleServiceFormField(
        [dateField, unsupportedField, fields[1]],
        [
          { fieldId: 'date', x: 0, y: 0 },
          { fieldId: 'unsupported', x: 0, y: 100 },
          { fieldId: 'dependent', x: 0, y: 200 },
        ],
        null,
      )?.id,
    ).toBe('dependent');
  });

  it('returns no next field after the last visible editable field', () => {
    expect(
      selectNextVisibleServiceFormField(
        fields,
        [
          { fieldId: 'controller', x: 0, y: 0 },
          { fieldId: 'dependent', x: 0, y: 100 },
        ],
        'dependent',
      ),
    ).toBeNull();
  });

  it('includes optional fields promoted to required at runtime in progress', () => {
    const vehicleType: ServiceFormField = {
      ...fields[1],
      id: 'vehicle-type',
      key: '_dn_vehicletypeid_value',
      optional: true,
    };

    expect(
      selectServiceFormProgress(
        [vehicleType],
        new Set(['vehicle-type']),
        {},
        { requiredFieldOverrides: { _dn_vehicletypeid_value: true } },
      ),
    ).toEqual({ completed: 0, total: 1, remaining: 1 });
  });

  it('treats hidden signature fields as complete for progress', () => {
    const signatureField: ServiceFormField = {
      id: 'receiver-signature',
      key: 'signature_receiver',
      label: 'Handtekening geadresseerde',
      type: 'signature',
      readOnly: false,
      optional: false,
      autocomplete: false,
      validations: [],
      raw: {
        subFields: {
          name: { label: [{ 'language-code': 1043, value: 'Naam' }] },
          email: { label: [{ 'language-code': 1043, value: 'Email' }] },
        },
      },
    };
    const visible = new Set(['receiver-signature']);

    expect(
      selectServiceFormProgress(
        [signatureField],
        visible,
        { signature_receiver: { value: '', displayValue: '' } },
        { hideSignature: { signature_receiver: true } },
      ),
    ).toEqual({ completed: 1, total: 1, remaining: 0 });
  });

  it('allows missing email when no email confirmation is selected', () => {
    const signatureField: ServiceFormField = {
      id: 'receiver-signature',
      key: 'signature_receiver',
      label: 'Handtekening geadresseerde',
      type: 'signature',
      readOnly: false,
      optional: false,
      autocomplete: false,
      validations: [],
      raw: {
        subFields: {
          name: { label: [{ 'language-code': 1043, value: 'Naam' }] },
          email: { label: [{ 'language-code': 1043, value: 'Email' }] },
        },
      },
    };
    const visible = new Set(['receiver-signature']);
    const answers = {
      signature_receiver: {
        value: 'data:image/png;base64,xxx',
        displayValue: 'data:image/png;base64,xxx',
        signatureName: 'Jan Jansen',
        email: '',
      },
    };

    expect(
      selectServiceFormProgress([signatureField], visible, answers, {
        noEmailConfirmation: { signature_receiver: true },
      }),
    ).toEqual({ completed: 1, total: 1, remaining: 0 });
  });
});

describe('quick view field selection', () => {
  const readOnlyField: ServiceFormField = {
    id: 'info',
    key: 'dn_info',
    label: 'Info',
    type: 'string',
    readOnly: true,
    optional: true,
    autocomplete: false,
    validations: [],
    raw: {},
  };
  const optionalField: ServiceFormField = {
    id: 'notes',
    key: 'dn_notes',
    label: 'Notes',
    type: 'string',
    readOnly: false,
    optional: true,
    autocomplete: false,
    validations: [],
    raw: {},
  };
  const quickFields = [...fields, readOnlyField, optionalField];
  const allVisible = new Set(quickFields.map((field) => field.id));

  it('treats a valid answer as filled and an empty optional as not filled', () => {
    expect(
      isServiceFormFieldFilled(fields[0], { dn_controller: { value: 1, displayValue: 'Ja' } }),
    ).toBe(true);
    expect(isServiceFormFieldFilled(optionalField, {})).toBe(false);
  });

  it('treats a skipped signature as filled', () => {
    const signatureField: ServiceFormField = {
      id: 'receiver-signature',
      key: 'signature_receiver',
      label: 'Handtekening',
      type: 'signature',
      readOnly: false,
      optional: false,
      autocomplete: false,
      validations: [],
      raw: {},
    };

    expect(isServiceFormFieldFilled(signatureField, {}, {}, { signature_receiver: true })).toBe(
      true,
    );
  });

  it('hides read-only and filled fields, keeps empty and invalid ones', () => {
    const answers = {
      dn_controller: { value: 1, displayValue: 'Ja' },
      dn_dependent: { value: '', displayValue: '' },
      dn_info: { value: 'dossier', displayValue: 'dossier' },
    };

    expect(
      selectQuickViewFields(quickFields, allVisible, answers).map((field) => field.id),
    ).toEqual(['dependent', 'notes']);
  });

  it('keeps required answers entered by the user visible but hides CRM-prefilled answers', () => {
    const answers = {
      dn_controller: { value: 1, displayValue: 'Ja' },
      dn_dependent: { value: 'entered', displayValue: 'entered' },
    };
    const initialAnswers = {
      dn_controller: { value: 1, displayValue: 'Ja' },
    };

    expect(
      selectQuickViewFields(fields, new Set(['controller', 'dependent']), answers, {
        initialAnswers,
      }).map((field) => field.id),
    ).toEqual(['dependent']);
  });

  it('removes sections that have no fields left to fill', () => {
    const answers = {
      dn_controller: { value: 1, displayValue: 'Ja' },
      dn_dependent: { value: '', displayValue: '' },
      dn_info: { value: 'dossier', displayValue: 'dossier' },
    };

    expect(
      selectQuickViewSections(
        [
          { id: 'done', title: 'Done', fields: [readOnlyField], contractRights: [] },
          { id: 'open', title: 'Open', fields: quickFields, contractRights: [] },
        ],
        allVisible,
        answers,
      ),
    ).toEqual([
      {
        id: 'open',
        title: 'Open',
        fields: [fields[1], optionalField],
        contractRights: [],
      },
    ]);
  });

  it('keeps the focused field visible even after it becomes filled', () => {
    const answers = {
      dn_controller: { value: 1, displayValue: 'Ja' },
      dn_dependent: { value: 'done', displayValue: 'done' },
    };

    expect(
      selectQuickViewFields(fields, new Set(['controller', 'dependent']), answers, {
        focusedFieldId: 'dependent',
      }).map((field) => field.id),
    ).toEqual(['dependent']);
  });

  it('keeps an invalid filled field visible', () => {
    const longField: ServiceFormField = {
      id: 'short',
      key: 'dn_short',
      label: 'Short',
      type: 'string',
      readOnly: false,
      optional: true,
      autocomplete: false,
      validations: [{ validation_type: 'max-len', value: 3 }],
      raw: {},
    };

    expect(
      selectQuickViewFields([longField], new Set(['short']), {
        dn_short: { value: 'too-long', displayValue: 'too-long' },
      }).map((field) => field.id),
    ).toEqual(['short']);
  });
});

describe('isServiceFormDirty', () => {
  it('is false when answers match the CRM baseline', () => {
    const answers = { dn_name: { value: 'A', displayValue: 'A' } };
    expect(isServiceFormDirty(answers, answers)).toBe(false);
  });

  it('is true once a value differs', () => {
    expect(
      isServiceFormDirty(
        { dn_name: { value: 'A', displayValue: 'A' } },
        { dn_name: { value: 'B', displayValue: 'B' } },
      ),
    ).toBe(true);
  });
});
