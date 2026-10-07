import { describe, expect, it } from 'vitest';
import { createServiceFormScenario } from './scenario-export';
import type { NormalizedServiceForm } from './types';

const form: NormalizedServiceForm = {
  serviceCode: 1004,
  serviceName: 'Berging',
  phase: 1,
  phaseName: 'Start',
  photosMandatory: [],
  sections: [],
  diagnostics: [],
  requiresTermsAcceptance: false,
};

describe('createServiceFormScenario', () => {
  it('keeps phase-specific condition values and redacts personal answer data', () => {
    const scenario = createServiceFormScenario(
      form,
      {
        dn_ekv: { value: false, displayValue: 'Nee', table: 'dn_truefalse' },
        dn_driveremail: { value: 'driver@example.com', displayValue: 'driver@example.com' },
      },
      { dn_ekv: false, dn_driveremail: 'driver@example.com' },
    );

    expect(scenario).toMatchObject({ phase: 1, serviceCode: 1004 });
    expect(scenario.answers.dn_ekv).toMatchObject({ value: false, displayValue: 'Nee' });
    expect(scenario.answers.dn_driveremail).toMatchObject({
      value: '[test value]',
      displayValue: '[test value]',
    });
    expect(scenario.submission).toEqual({ dn_ekv: false, dn_driveremail: '[test value]' });
  });
});
