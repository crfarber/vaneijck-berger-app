import { describe, expect, it } from 'vitest';
import { evaluateServiceFormVisibility } from './conditions';
import type { NormalizedServiceForm, ServiceFormAnswers, ServiceFormField } from './types';

const field = (
  id: string,
  key: string,
  requiredVisibility?: ServiceFormField['requiredVisibility'],
): ServiceFormField => ({
  id,
  key,
  label: key,
  type: 'select',
  readOnly: false,
  optional: false,
  autocomplete: true,
  requiredVisibility,
  validations: [],
  raw: {},
});

const form = (...sectionFields: ServiceFormField[][]): NormalizedServiceForm => ({
  serviceCode: 1012,
  serviceName: 'Planbaar Transport',
  phase: 1,
  phaseName: 'Start',
  photosMandatory: [],
  diagnostics: [],
  sections: sectionFields.map((fields, index) => ({
    id: `section-${index}`,
    title: `Section ${index}`,
    fields,
    contractRights: [],
  })),
  requiresTermsAcceptance: false,
});

const answer = (value: unknown, table?: string): ServiceFormAnswers[string] => ({
  value,
  displayValue: value,
  table,
});

describe('evaluateServiceFormVisibility', () => {
  it('resolves a controller from another legacy tab', () => {
    const controller = field('section-0/controller', 'dn_controller');
    const dependent = field('section-1/dependent', 'dn_dependent', {
      property: 'dn_controller',
      value: 2,
    });

    const result = evaluateServiceFormVisibility(form([controller], [dependent]), {
      dn_controller: answer(2),
    });

    expect(result.visibleFieldIds.has(dependent.id)).toBe(true);
    expect(result.visibleSectionIds.has('section-1')).toBe(true);
  });

  it('hides a dependent section when its only field does not match', () => {
    const controller = field('section-0/controller', 'dn_controller');
    const dependent = field('section-1/dependent', 'dn_dependent', {
      property: 'dn_controller',
      value: 2,
    });

    const result = evaluateServiceFormVisibility(form([controller], [dependent]), {
      dn_controller: answer(1),
    });

    expect(result.visibleFieldIds.has(dependent.id)).toBe(false);
    expect(result.visibleSectionIds.has('section-1')).toBe(false);
  });

  it('requires every controller in a conditional chain to be visible', () => {
    const root = field('root', 'dn_root');
    const parent = field('parent', 'dn_parent', { property: 'dn_root', value: true });
    const child = field('child', 'dn_child', { property: 'dn_parent', value: 5 });
    const answers = { dn_root: answer(false, 'dn_truefalse'), dn_parent: answer(5) };

    const result = evaluateServiceFormVisibility(form([root], [parent], [child]), answers);

    expect(result.visibleFieldIds.has(parent.id)).toBe(false);
    expect(result.visibleFieldIds.has(child.id)).toBe(false);
  });

  it('supports array values and optional yes/no numeric encoding', () => {
    const controller = field('controller', 'dn_controller');
    const arrayDependent = field('array', 'dn_array', { property: 'dn_controller', value: [2, 3] });
    const booleanDependent = field('boolean', 'dn_boolean', {
      property: 'dn_optional',
      value: false,
    });
    const optional = field('optional', 'dn_optional');

    const result = evaluateServiceFormVisibility(
      form([controller, optional], [arrayDependent, booleanDependent]),
      {
        dn_controller: answer('3'),
        dn_optional: answer(0, 'dn_optionalyesno'),
      },
    );

    expect(result.visibleFieldIds.has(arrayDependent.id)).toBe(true);
    expect(result.visibleFieldIds.has(booleanDependent.id)).toBe(true);
  });

  it('reports missing controllers and cycles instead of throwing', () => {
    const missing = field('missing', 'dn_missing', { property: 'dn_unknown', value: 1 });
    const first = field('first', 'dn_first', { property: 'dn_second', value: 1 });
    const second = field('second', 'dn_second', { property: 'dn_first', value: 1 });

    const result = evaluateServiceFormVisibility(form([missing, first, second]), {
      dn_first: answer(1),
      dn_second: answer(1),
    });

    expect(result.visibleFieldIds.size).toBe(0);
    expect(result.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(['missing-condition-controller', 'condition-cycle']),
    );
  });
});
