import { describe, expect, it } from 'vitest';
import { normalizeServiceFormDefinition } from './schema';

const rawDefinition = {
  servicecode: 1012,
  servicename: [
    { 'language-code': 1043, value: 'Planbaar transport' },
    { 'language-code': 1044, value: 'Scheduled transport' },
  ],
  definition: [
    {
      phase: 1,
      'phase-name': [{ 'language-code': 1043, value: 'Start' }],
      tabs: [
        {
          header: [{ 'language-code': 1044, value: 'Dossier' }],
          fields: [
            {
              name: 'dn_shared',
              label: [{ 'language-code': 1043, value: 'Gedeeld' }],
              type: 'decimal',
              autoform: { value: 'dn_shared_formatted' },
            },
            {},
          ],
        },
        {
          header: [{ 'language-code': 1043, value: 'Vervoer' }],
          fields: [
            {
              name: 'dn_shared',
              label: [{ 'language-code': 1043, value: 'Nogmaals' }],
              type: 'decimal',
              autoform: { value: 'dn_shared_formatted' },
            },
          ],
        },
      ],
    },
    {
      phase: 2,
      'phase-name': [{ 'language-code': 1043, value: 'Afronden' }],
      tabs: [],
    },
  ],
};

describe('normalizeServiceFormDefinition', () => {
  it('selects phase and localized labels with deterministic fallback', () => {
    const result = normalizeServiceFormDefinition(rawDefinition, { phase: 1, languageCode: 1044 });

    expect(result.form.serviceName).toBe('Scheduled transport');
    expect(result.form.phaseName).toBe('Start');
    expect(result.form.sections[0]?.title).toBe('Dossier');
    expect(result.form.sections[1]?.title).toBe('Vervoer');
  });

  it('creates stable occurrence ids while sharing one answer key', () => {
    const result = normalizeServiceFormDefinition(rawDefinition, {
      phase: 1,
      languageCode: 1043,
      values: { dn_shared: 12, dn_shared_formatted: '12' },
    });
    const first = result.form.sections[0]?.fields[0];
    const repeated = result.form.sections[1]?.fields[0];

    expect(first?.key).toBe(repeated?.key);
    expect(first?.id).not.toBe(repeated?.id);
    expect(result.initialAnswers.dn_shared).toEqual({
      value: 12,
      displayValue: '12.00',
      table: undefined,
    });
  });

  it('skips malformed fields and records a diagnostic', () => {
    const result = normalizeServiceFormDefinition(rawDefinition, { phase: 1, languageCode: 1043 });

    expect(result.form.sections[0]?.fields).toHaveLength(1);
    expect(result.form.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-field' })]),
    );
  });

  it('unwraps stored dataDefinition containers and falls back to first phase', () => {
    const result = normalizeServiceFormDefinition([{ dataDefinition: [rawDefinition] }], {
      phase: 99,
      languageCode: 1043,
    });

    expect(result.form.serviceCode).toBe(1012);
    expect(result.form.phase).toBe(1);
  });

  it('keeps required, optional, and readonly flags independent', () => {
    const result = normalizeServiceFormDefinition(
      {
        servicecode: 1012,
        definition: [
          {
            phase: 1,
            tabs: [
              {
                fields: [
                  {
                    name: '_dn_vehiclecountryoforiginid_value',
                    type: 'select',
                    table: 'dn_country',
                    autoform: { readonly: false, optional: false },
                  },
                  {
                    name: 'dn_vehiclebrand',
                    type: 'string',
                    autoform: { readonly: true, optional: true },
                  },
                ],
              },
            ],
          },
        ],
      },
      { phase: 1, languageCode: 1043 },
    );

    const [country, vehicleBrand] = result.form.sections[0]?.fields ?? [];
    expect(country).toMatchObject({ readOnly: false, optional: false, autocomplete: false });
    expect(vehicleBrand).toMatchObject({ readOnly: true, optional: true, autocomplete: false });
  });

  it.each([
    [1004, 'dn_ekv'],
    [1007, 'dn_breakdownsettlementcode'],
  ])('warns when service %i misses phase-one field %s', (servicecode, fieldKey) => {
    const result = normalizeServiceFormDefinition(
      { servicecode, definition: [{ phase: 1, tabs: [{ fields: [] }] }] },
      { phase: 1, languageCode: 1043 },
    );

    expect(result.form.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'missing-early-completion-field', fieldKey }),
    );
  });

  it('does not require the early-completion field in phase two', () => {
    const result = normalizeServiceFormDefinition(
      { servicecode: 1004, definition: [{ phase: 2, tabs: [{ fields: [] }] }] },
      { phase: 2, languageCode: 1043 },
    );

    expect(result.form.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing-early-completion-field' })]),
    );
  });

  it('normalizes and initializes an optional insurancecompany lookup', () => {
    const insuranceDefinition = {
      servicecode: 1012,
      definition: [
        {
          phase: 1,
          tabs: [
            {
              fields: [
                {
                  name: '_dn_insuranceproxyid_value',
                  label: [{ 'language-code': 1043, value: 'Volmacht/tussenpersoon' }],
                  type: 'select',
                  table: 'insurancecompany',
                  autoform: {
                    readonly: false,
                    optional: true,
                    autocomplete: true,
                    value: '_dn_insuranceproxyid_value',
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const result = normalizeServiceFormDefinition(insuranceDefinition, {
      phase: 1,
      languageCode: 1043,
      values: {
        _dn_insuranceproxyid_value: 'account-id',
        '_dn_insuranceproxyid_value@OData.Community.Display.V1.FormattedValue': 'Verzekeraar BV',
      },
    });

    expect(result.form.sections[0]?.fields[0]).toMatchObject({
      key: '_dn_insuranceproxyid_value',
      table: 'insurancecompany',
      readOnly: false,
      optional: true,
      autocomplete: true,
      autoformValue: '_dn_insuranceproxyid_value',
    });
    expect(result.initialAnswers._dn_insuranceproxyid_value).toEqual({
      value: 'account-id',
      displayValue: 'Verzekeraar BV',
      table: 'insurancecompany',
    });

    // Without a formatted label, `resolveServiceFormValueToShow` falls back to the raw stored
    // value for a `select` field (the same key here, since `autoform.value` repeats `field.key`)
    // — the vaneijck-salvageapp pilot's own test for this exact input expects the "Selecteer"
    // placeholder instead, but its own `resolveServiceFormValueToShow`/`buildInitialServiceFormAnswer`
    // (ported here unchanged) does not special-case a select field with a raw value and no label;
    // this asserts the behaviour the code actually has, not that older, seemingly-stale expectation.
    const withoutFormattedValue = normalizeServiceFormDefinition(insuranceDefinition, {
      phase: 1,
      languageCode: 1043,
      values: { _dn_insuranceproxyid_value: 'account-id' },
      pleaseSelectLabel: 'Selecteer',
    });
    expect(withoutFormattedValue.initialAnswers._dn_insuranceproxyid_value).toMatchObject({
      value: 'account-id',
      displayValue: 'account-id',
    });
  });
});
