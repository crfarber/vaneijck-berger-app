import { describe, expect, it } from 'vitest';
import { hasTransportConditions, resolveTransportConditionsUrl } from './transport-conditions';
import type { ServiceFormField } from './types';

const createField = (overrides: Partial<ServiceFormField> = {}): ServiceFormField => ({
  id: 'sig',
  key: 'signature_sender',
  label: 'Handtekening',
  type: 'signature',
  table: '',
  readOnly: false,
  optional: false,
  autocomplete: false,
  validations: [],
  raw: {},
  ...overrides,
});

describe('resolveTransportConditionsUrl', () => {
  it('returns the configured transport-conditions URL', () => {
    const field = createField({
      raw: {
        subFields: {
          transportConditions: {
            url: 'https://example.com/terms',
          },
        },
      },
    });

    expect(resolveTransportConditionsUrl(field)).toBe('https://example.com/terms');
    expect(hasTransportConditions(field)).toBe(true);
  });

  it('ignores blank or missing URLs', () => {
    expect(resolveTransportConditionsUrl(createField())).toBeNull();
    expect(hasTransportConditions(createField())).toBe(false);
    expect(
      resolveTransportConditionsUrl(
        createField({
          raw: { subFields: { transportConditions: { url: '  ' } } },
        }),
      ),
    ).toBeNull();
  });
});
