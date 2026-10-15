import { describe, expect, it } from 'vitest';
import {
  applyRdwVehicleAutofill,
  clearRdwAutofillAnswers,
  getVehicleSectionFieldOrder,
  partitionVehicleRegistrationFields,
} from './rdw-autofill';

const PLEASE_SELECT = 'Selecteer';

describe('getVehicleSectionFieldOrder', () => {
  it('returns only fields that exist in the schema', () => {
    expect(
      getVehicleSectionFieldOrder([
        'dn_vehicleregistrationno',
        '_dn_vehiclecountryoforiginid_value',
        '_dn_vehiclebrandid_value',
        '_dn_vehicletypeid_value',
      ]),
    ).toEqual([
      'dn_vehicleregistrationno',
      '_dn_vehiclecountryoforiginid_value',
      '_dn_vehiclebrandid_value',
      '_dn_vehicletypeid_value',
    ]);
  });

  it('hides RDW-readonly fields when lookup failed', () => {
    expect(
      getVehicleSectionFieldOrder(
        [
          'dn_vehicleregistrationno',
          '_dn_vehiclecountryoforiginid_value',
          'dn_vehiclebrand',
          'dn_vehicletradename',
          'dn_vwe_vehicleinformationid.vwe_rdw_kleur1',
          '_dn_vehiclebrandid_value',
          '_dn_vehicletypeid_value',
        ],
        { rdwLookupFailed: true },
      ),
    ).toEqual([
      'dn_vehicleregistrationno',
      '_dn_vehiclecountryoforiginid_value',
      '_dn_vehiclebrandid_value',
      '_dn_vehicletypeid_value',
    ]);
  });

  it('hides manual brand/type while RDW succeeded and the user has not overridden', () => {
    expect(
      getVehicleSectionFieldOrder(
        [
          'dn_vehicleregistrationno',
          'dn_vehiclebrand',
          '_dn_vehiclebrandid_value',
          '_dn_vehicletypeid_value',
        ],
        { hideManualVehicleFields: true },
      ),
    ).toEqual(['dn_vehicleregistrationno', 'dn_vehiclebrand']);
  });
});

describe('applyRdwVehicleAutofill', () => {
  it('fills country, brand, type and RDW text fields from RDW when empty', () => {
    const updates = applyRdwVehicleAutofill({
      rdwInfo: { model: 'Nissan', tradeName: 'Nissan Juke', primaryColor: 'Zwart' },
      answers: {},
      fieldKeys: new Set([
        '_dn_vehiclecountryoforiginid_value',
        '_dn_vehiclebrandid_value',
        '_dn_vehicletypeid_value',
        'dn_vehiclebrand',
        'dn_vehicletradename',
        'dn_vwe_vehicleinformationid.vwe_rdw_kleur1',
      ]),
      countries: [{ dn_name: 'Nederland', dn_countryid: 'nl', dn_iso2code: 'NL' }],
      vehicleBrands: [{ dn_name: 'Nissan', dn_vehiclebrandid: 'brand-1' }],
      vehicleTypes: [
        {
          dn_name: 'Juke',
          dn_vehicletypeid: 'type-1',
          _dn_vehiclebrandid_value: 'brand-1',
        },
      ],
      pleaseSelectLabel: PLEASE_SELECT,
    });

    expect(updates).toEqual({
      _dn_vehiclecountryoforiginid_value: { value: 'nl', displayValue: 'Nederland' },
      _dn_vehiclebrandid_value: { value: 'brand-1', displayValue: 'Nissan' },
      _dn_vehicletypeid_value: { value: 'type-1', displayValue: 'Juke' },
      dn_vehiclebrand: { value: 'Nissan', displayValue: 'Nissan' },
      dn_vehicletradename: { value: 'Nissan Juke', displayValue: 'Nissan Juke' },
      'dn_vwe_vehicleinformationid.vwe_rdw_kleur1': { value: 'Zwart', displayValue: 'Zwart' },
    });
  });

  it('skips filled fields unless overwrite is set', () => {
    const updates = applyRdwVehicleAutofill({
      rdwInfo: { model: 'Toyota', tradeName: 'Yaris' },
      answers: {
        _dn_vehiclebrandid_value: { value: 'keep', displayValue: 'Keep' },
      },
      fieldKeys: new Set(['_dn_vehiclebrandid_value']),
      countries: [],
      vehicleBrands: [{ dn_name: 'Toyota', dn_vehiclebrandid: 'toyota' }],
      vehicleTypes: [],
      pleaseSelectLabel: PLEASE_SELECT,
    });
    expect(updates).toEqual({});
  });

  it('overwrites filled fields when the plate changed', () => {
    const updates = applyRdwVehicleAutofill({
      rdwInfo: { model: 'Toyota' },
      answers: {
        _dn_vehiclebrandid_value: { value: 'old', displayValue: 'Old' },
      },
      fieldKeys: new Set(['_dn_vehiclebrandid_value']),
      countries: [],
      vehicleBrands: [{ dn_name: 'Toyota', dn_vehiclebrandid: 'toyota' }],
      vehicleTypes: [],
      pleaseSelectLabel: PLEASE_SELECT,
      overwriteRdwDerivedFields: true,
    });
    expect(updates._dn_vehiclebrandid_value).toEqual({
      value: 'toyota',
      displayValue: 'Toyota',
    });
  });
});

describe('clearRdwAutofillAnswers', () => {
  it('clears only autofill keys that exist', () => {
    expect(clearRdwAutofillAnswers(new Set(['_dn_vehiclebrandid_value']), PLEASE_SELECT)).toEqual({
      _dn_vehiclebrandid_value: { value: '', displayValue: PLEASE_SELECT },
    });
  });

  it('clears RDW text fields to empty strings', () => {
    expect(
      clearRdwAutofillAnswers(
        new Set([
          'dn_vehiclebrand',
          'dn_vehicletradename',
          'dn_vwe_vehicleinformationid.vwe_rdw_kleur1',
        ]),
        PLEASE_SELECT,
      ),
    ).toEqual({
      dn_vehiclebrand: { value: '', displayValue: '' },
      dn_vehicletradename: { value: '', displayValue: '' },
      'dn_vwe_vehicleinformationid.vwe_rdw_kleur1': { value: '', displayValue: '' },
    });
  });
});

describe('partitionVehicleRegistrationFields', () => {
  it('pulls vehicle fields into a group when a plate key is present', () => {
    const fields = [
      { key: 'dn_notes' },
      { key: 'dn_vehicleregistrationno' },
      { key: '_dn_vehiclebrandid_value' },
      { key: 'dn_other' },
    ];
    expect(partitionVehicleRegistrationFields(fields)).toEqual({
      vehicleFields: [{ key: 'dn_vehicleregistrationno' }, { key: '_dn_vehiclebrandid_value' }],
      otherFields: [{ key: 'dn_notes' }, { key: 'dn_other' }],
    });
  });

  it('keeps everything as other when there is no plate trigger', () => {
    const fields = [{ key: '_dn_vehiclebrandid_value' }, { key: 'dn_notes' }];
    expect(partitionVehicleRegistrationFields(fields)).toEqual({
      vehicleFields: [],
      otherFields: fields,
    });
  });
});
