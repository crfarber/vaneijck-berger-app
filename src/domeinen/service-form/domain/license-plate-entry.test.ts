import { describe, expect, it } from 'vitest';
import type { ServiceFormField } from './types';
import {
  buildClearedLicensePlateAnswers,
  buildLicensePlateGroup,
  buildLicensePlateRenderItems,
  buildLicensePlateSummary,
  findLicensePlateGroupInFields,
  hasAppliedLicensePlateVehicleAnswers,
  hasLicensePlateTypeAnswer,
  initialLicensePlateState,
  LicensePlatePhase,
  nextLicensePlateState,
  readLicensePlateGroup,
  resolveLegacyLicensePlateMapping,
  shouldConfirmReported,
  shouldConfirmRdwVehicle,
  shouldNeutralizeLicensePlateChrome,
  shouldRequireManualVehicleFields,
  shouldShowManualVehicleFields,
  shouldShowRdwSummary,
  toLicensePlateFieldMapping,
} from './license-plate-entry';

const field = (key: string, raw: ServiceFormField['raw'] = {}): ServiceFormField => ({
  id: key,
  key,
  label: key,
  type: 'string',
  readOnly: false,
  optional: true,
  autocomplete: false,
  validations: [],
  raw,
});

const validGroupRaw = {
  license_plate_group: {
    id: 'dn_vehicleregistrationno',
    label: [
      { 'language-code': 1043, value: 'Kenteken' },
      { 'language-code': 1044, value: 'License plate' },
    ],
    fields: {
      foundPlate: 'dn_vehicleregistrationno',
      reportedPlate: 'dn_vehicleregistrationoinitial',
      country: '_dn_vehiclecountryoforiginid_value',
      rdwBrand: 'dn_vehiclebrand',
      rdwType: 'dn_vehicletradename',
      rdwColor: 'dn_vwe_vehicleinformationid.vwe_rdw_kleur1',
      brand: '_dn_vehiclebrandid_value',
      type: '_dn_vehicletypeid_value',
    },
    flow: 'nl_rdw_lookup' as const,
    confirmVehicle: true,
    allowManual: true,
    allowForeignManual: true,
  },
};

describe('readLicensePlateGroup', () => {
  it('reads a valid license_plate_group', () => {
    expect(readLicensePlateGroup(validGroupRaw)).toEqual({
      id: 'dn_vehicleregistrationno',
      label: { nl: 'Kenteken', en: 'License plate' },
      fields: validGroupRaw.license_plate_group.fields,
      flow: 'nl_rdw_lookup',
      confirmVehicle: true,
      allowManual: true,
      allowForeignManual: true,
    });
  });

  it('returns null for an unknown flow', () => {
    expect(
      readLicensePlateGroup({
        license_plate_group: {
          ...validGroupRaw.license_plate_group,
          flow: 'other',
        },
      }),
    ).toBeNull();
  });

  it('returns null when required roles are missing', () => {
    expect(
      readLicensePlateGroup({
        license_plate_group: {
          id: 'x',
          fields: { foundPlate: 'dn_vehicleregistrationno' },
          flow: 'nl_rdw_lookup',
        },
      }),
    ).toBeNull();
  });

  it('defaults confirm and manual flags when omitted', () => {
    const result = readLicensePlateGroup({
      license_plate_group: {
        id: 'dn_vehicleregistrationno',
        fields: {
          foundPlate: 'dn_vehicleregistrationno',
          brand: '_dn_vehiclebrandid_value',
        },
        flow: 'nl_rdw_lookup',
      },
    });
    expect(result).toMatchObject({
      confirmVehicle: true,
      allowManual: true,
      allowForeignManual: true,
    });
  });
});

describe('buildLicensePlateGroup / render items', () => {
  it('builds a group when marker and mapped fields exist', () => {
    const found = field('dn_vehicleregistrationno', validGroupRaw);
    const reported = field('dn_vehicleregistrationoinitial');
    const brand = field('_dn_vehiclebrandid_value');
    const type = field('_dn_vehicletypeid_value');
    const byKey = new Map([found, reported, brand, type].map((item) => [item.key, item] as const));

    const group = buildLicensePlateGroup(found, byKey);
    expect(group?.mapping.foundPlate).toBe('dn_vehicleregistrationno');
    expect(group?.orderedFields.map((item) => item.key)).toEqual([
      'dn_vehicleregistrationoinitial',
      'dn_vehicleregistrationno',
      '_dn_vehiclebrandid_value',
      '_dn_vehicletypeid_value',
    ]);
  });

  it('returns null when brand field is absent from the schema', () => {
    const found = field('dn_vehicleregistrationno', validGroupRaw);
    const byKey = new Map([[found.key, found]]);
    expect(buildLicensePlateGroup(found, byKey)).toBeNull();
  });

  it('claims group members and exposes one license-plate item', () => {
    const found = field('dn_vehicleregistrationno', validGroupRaw);
    const brand = field('_dn_vehiclebrandid_value');
    const other = field('dn_notes');
    const items = buildLicensePlateRenderItems([other, found, brand]);
    expect(items).toEqual([
      { kind: 'field', field: other },
      { kind: 'license-plate', group: expect.objectContaining({ anchor: found }) },
    ]);
    expect(findLicensePlateGroupInFields([found, brand])?.anchor.key).toBe(
      'dn_vehicleregistrationno',
    );
  });
});

describe('resolveLegacyLicensePlateMapping', () => {
  it('maps legacy field names when present', () => {
    expect(
      resolveLegacyLicensePlateMapping(
        new Set(['dn_vehicleregistrationno', '_dn_vehiclebrandid_value', 'dn_vehiclebrand']),
      ),
    ).toEqual({
      foundPlate: 'dn_vehicleregistrationno',
      brand: '_dn_vehiclebrandid_value',
      rdwBrand: 'dn_vehiclebrand',
    });
  });

  it('falls back to dn_vehicleregistration as found plate', () => {
    expect(
      resolveLegacyLicensePlateMapping(
        new Set(['dn_vehicleregistration', '_dn_vehiclebrandid_value']),
      ),
    ).toMatchObject({
      foundPlate: 'dn_vehicleregistration',
      brand: '_dn_vehiclebrandid_value',
    });
  });

  it('returns null without a plate trigger', () => {
    expect(resolveLegacyLicensePlateMapping(new Set(['_dn_vehiclebrandid_value']))).toBeNull();
  });
});

describe('buildLicensePlateSummary / cleared answers', () => {
  it('builds a summary from RDW overlay and country', () => {
    const mapping = toLicensePlateFieldMapping(validGroupRaw.license_plate_group.fields);
    expect(
      buildLicensePlateSummary(
        mapping,
        {
          _dn_vehiclecountryoforiginid_value: {
            value: 'nl',
            displayValue: 'Nederland',
          },
        },
        { brand: 'Volkswagen', type: 'Golf', color: 'zwart' },
      ),
    ).toBe('Volkswagen, Golf, zwart, Nederland');
  });

  it('clears select roles with the please-select label', () => {
    const mapping = toLicensePlateFieldMapping(validGroupRaw.license_plate_group.fields);
    expect(buildClearedLicensePlateAnswers(mapping, ['brand', 'rdwBrand'], 'Selecteer')).toEqual({
      _dn_vehiclebrandid_value: { value: '', displayValue: 'Selecteer' },
      dn_vehiclebrand: { value: '', displayValue: '' },
    });
  });
});

describe('hasAppliedLicensePlateVehicleAnswers / shouldConfirmRdwVehicle', () => {
  const mapping = toLicensePlateFieldMapping(validGroupRaw.license_plate_group.fields);
  const pleaseSelect = 'Selecteer';

  it('detects applied vehicle data from CRM brand or RDW brand text', () => {
    expect(hasAppliedLicensePlateVehicleAnswers(mapping, {}, pleaseSelect)).toBe(false);
    expect(
      hasAppliedLicensePlateVehicleAnswers(
        mapping,
        { _dn_vehiclebrandid_value: { value: '', displayValue: pleaseSelect } },
        pleaseSelect,
      ),
    ).toBe(false);
    expect(
      hasAppliedLicensePlateVehicleAnswers(
        mapping,
        { _dn_vehiclebrandid_value: { value: 'brand-1', displayValue: 'Volkswagen' } },
        pleaseSelect,
      ),
    ).toBe(true);
    expect(
      hasAppliedLicensePlateVehicleAnswers(
        mapping,
        { dn_vehiclebrand: { value: 'Volkswagen', displayValue: 'Volkswagen' } },
        pleaseSelect,
      ),
    ).toBe(true);
  });

  it('detects a filled type answer for the type gap on restore', () => {
    expect(hasLicensePlateTypeAnswer(mapping, {}, pleaseSelect)).toBe(false);
    expect(
      hasLicensePlateTypeAnswer(
        mapping,
        { _dn_vehicletypeid_value: { value: 'type-1', displayValue: 'Golf' } },
        pleaseSelect,
      ),
    ).toBe(true);
  });

  it('skips the apply-vehicle confirm when data was already applied or the dialog is pending', () => {
    expect(
      shouldConfirmRdwVehicle({
        confirmVehicle: true,
        alreadyApplied: false,
        pendingPlate: null,
        resultPlate: 'AB123C',
      }),
    ).toBe(true);
    expect(
      shouldConfirmRdwVehicle({
        confirmVehicle: true,
        alreadyApplied: true,
        pendingPlate: null,
        resultPlate: 'AB123C',
      }),
    ).toBe(false);
    expect(
      shouldConfirmRdwVehicle({
        confirmVehicle: true,
        alreadyApplied: false,
        pendingPlate: 'AB123C',
        resultPlate: 'AB123C',
      }),
    ).toBe(false);
    expect(
      shouldConfirmRdwVehicle({
        confirmVehicle: false,
        alreadyApplied: false,
        pendingPlate: null,
        resultPlate: 'AB123C',
      }),
    ).toBe(false);
  });

  it('restores summary when reopening a section with applied vehicle answers', () => {
    const restored = initialLicensePlateState(null, 'AB123C', {
      vehicleApplied: true,
      typeFilled: true,
    });
    expect(restored.phase).toBe(LicensePlatePhase.Summary);
    expect(shouldShowRdwSummary(restored)).toBe(true);

    const typeGap = initialLicensePlateState(null, 'AB123C', {
      vehicleApplied: true,
      typeFilled: false,
    });
    expect(typeGap.phase).toBe(LicensePlatePhase.Summary);
    expect(shouldShowManualVehicleFields(typeGap)).toBe(true);
  });
});

describe('nextLicensePlateState', () => {
  it('starts in confirm-reported when a reported plate is known and found is empty', () => {
    const state = initialLicensePlateState('AB-123-C');
    expect(state.phase).toBe(LicensePlatePhase.ConfirmReported);
    expect(shouldConfirmReported(state)).toBe(true);
  });

  it('accepts the reported plate into entering', () => {
    const state = nextLicensePlateState(initialLicensePlateState('AB-123-C'), {
      type: 'acceptReported',
    });
    expect(state).toMatchObject({
      phase: LicensePlatePhase.Entering,
      foundPlate: 'AB-123-C',
    });
  });

  it('rejects reported and clears the found plate', () => {
    const state = nextLicensePlateState(initialLicensePlateState('AB-123-C'), {
      type: 'rejectReported',
    });
    expect(state).toMatchObject({
      phase: LicensePlatePhase.Entering,
      foundPlate: '',
    });
  });

  it('moves entering → looking-up → summary when type matched', () => {
    let state = initialLicensePlateState(null, 'AB123C');
    state = nextLicensePlateState(state, { type: 'lookupStarted' });
    expect(state.phase).toBe(LicensePlatePhase.LookingUp);
    state = nextLicensePlateState(state, {
      type: 'lookupSucceeded',
      typeMatched: true,
    });
    expect(state.phase).toBe(LicensePlatePhase.Summary);
    expect(shouldShowRdwSummary(state)).toBe(true);
    expect(shouldShowManualVehicleFields(state)).toBe(false);
  });

  it('shows the type gap when brand matched but type did not', () => {
    const state = nextLicensePlateState(initialLicensePlateState(null, 'AB123C'), {
      type: 'lookupSucceeded',
      typeMatched: false,
    });
    expect(shouldShowManualVehicleFields(state)).toBe(true);
    expect(shouldShowRdwSummary(state)).toBe(false);
  });

  it('opens manual on lookup failure or confirm reject', () => {
    expect(
      nextLicensePlateState(initialLicensePlateState(null, 'AB123C'), {
        type: 'lookupFailed',
      }).phase,
    ).toBe(LicensePlatePhase.Manual);
    expect(
      nextLicensePlateState(initialLicensePlateState(null, 'AB123C'), {
        type: 'confirmVehicleRejected',
      }).phase,
    ).toBe(LicensePlatePhase.Manual);
  });

  it('opens foreign mode and ignores lookup while foreign', () => {
    let state = nextLicensePlateState(initialLicensePlateState(null), {
      type: 'openForeign',
    });
    expect(state.phase).toBe(LicensePlatePhase.Foreign);
    state = nextLicensePlateState(state, { type: 'lookupStarted' });
    expect(state.phase).toBe(LicensePlatePhase.Foreign);
  });

  it('resets back to confirm-reported when a reported plate exists', () => {
    let state = nextLicensePlateState(initialLicensePlateState('AB-123-C'), {
      type: 'acceptReported',
    });
    state = nextLicensePlateState(state, {
      type: 'lookupSucceeded',
      typeMatched: true,
    });
    state = nextLicensePlateState(state, { type: 'reset' });
    expect(state.phase).toBe(LicensePlatePhase.ConfirmReported);
    expect(state.foundPlate).toBe('');
  });

  it('clears summary when the plate changes during lookup race', () => {
    let state = nextLicensePlateState(initialLicensePlateState(null, 'AB123C'), {
      type: 'lookupStarted',
    });
    state = nextLicensePlateState(state, {
      type: 'plateChanged',
      plate: 'XY99Z',
      isDutch: true,
    });
    expect(state).toMatchObject({
      phase: LicensePlatePhase.Entering,
      foundPlate: 'XY99Z',
      showTypeGap: false,
    });
  });

  it('neutralizes NL plate chrome when RDW fails, foreign, or plate cannot be Dutch', () => {
    const afterFail = nextLicensePlateState(initialLicensePlateState(null, 'AB123C'), {
      type: 'lookupFailed',
    });
    expect(shouldNeutralizeLicensePlateChrome(afterFail, true)).toBe(true);

    const foreign = nextLicensePlateState(initialLicensePlateState(null), {
      type: 'openForeign',
    });
    expect(shouldNeutralizeLicensePlateChrome(foreign, false)).toBe(true);

    const entering = initialLicensePlateState(null, 'A1B2C3');
    expect(shouldNeutralizeLicensePlateChrome(entering, false, true)).toBe(true);
    expect(shouldShowManualVehicleFields(entering, true)).toBe(true);

    const afterSuccess = nextLicensePlateState(initialLicensePlateState(null, 'AB123C'), {
      type: 'lookupSucceeded',
      typeMatched: true,
    });
    expect(shouldNeutralizeLicensePlateChrome(afterSuccess, false)).toBe(false);

    const manualAfterSuccess = nextLicensePlateState(afterSuccess, { type: 'openManual' });
    expect(shouldNeutralizeLicensePlateChrome(manualAfterSuccess, false)).toBe(false);
  });

  it('requires brand and type when RDW has no match or the plate is foreign', () => {
    const afterFail = nextLicensePlateState(initialLicensePlateState(null, 'AB123C'), {
      type: 'lookupFailed',
    });
    expect(shouldRequireManualVehicleFields(afterFail, true)).toBe(true);

    const foreign = nextLicensePlateState(initialLicensePlateState(null), {
      type: 'openForeign',
    });
    expect(shouldRequireManualVehicleFields(foreign, false)).toBe(true);

    const afterSuccess = nextLicensePlateState(initialLicensePlateState(null, 'AB123C'), {
      type: 'lookupSucceeded',
      typeMatched: true,
    });
    expect(shouldRequireManualVehicleFields(afterSuccess, false)).toBe(false);

    // "Niet correct?" after a successful RDW hit does not promote type on its own.
    const manualAfterSuccess = nextLicensePlateState(afterSuccess, { type: 'openManual' });
    expect(shouldRequireManualVehicleFields(manualAfterSuccess, false)).toBe(false);
  });
});
