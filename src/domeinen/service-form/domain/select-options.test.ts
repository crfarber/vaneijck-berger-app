import { describe, expect, it } from 'vitest';
import {
  booleanSelectState,
  buildBooleanSelectAnswer,
  buildSelectOptions,
  filterSelectOptions,
  filterVehicleTypesByBrand,
  findBooleanSelectRow,
  optionLabel,
  optionValue,
  pickQuickOptions,
  selectedOptionAnswer,
  sortCountryOptions,
  sortOptionsByDistance,
} from './select-options';

const origin = { latitude: 0, longitude: 0 };

describe('optionLabel', () => {
  it('prefers Text, then dn_name, then name', () => {
    expect(optionLabel({ Text: 'a', dn_name: 'b', name: 'c' })).toBe('a');
    expect(optionLabel({ dn_name: 'b', name: 'c' })).toBe('b');
    expect(optionLabel({ name: 'c' })).toBe('c');
    expect(optionLabel({ Text: '', name: 42 })).toBeUndefined();
  });
});

describe('optionValue', () => {
  it('returns option-set values and CRM reference ids', () => {
    expect(optionValue({ Text: 'Ja', Value: 1 })).toBe(1);
    expect(optionValue({ Text: 'Nee', Value: 0 })).toBe(0);
    expect(optionValue({ dn_name: 'Nederland', dn_countryid: 'country-id' })).toBe('country-id');
    expect(optionValue({ dn_name: 'Depot', dn_locationid: 'location-id' })).toBe('location-id');
    expect(optionValue({ name: 'Verzekeraar', accountid: 'account-id' })).toBe('account-id');
  });

  it('falls back to another CRM id property', () => {
    expect(optionValue({ dn_name: 'Optie', dn_customid: 'custom-id' })).toBe('custom-id');
  });

  it('has no value for a row without an id', () => {
    expect(optionValue({ dn_name: 'Optie', dn_customid: null })).toBeUndefined();
  });
});

describe('sortOptionsByDistance', () => {
  const rows = [
    { dn_name: 'far', dn_latitude: 10, dn_longitude: 10 },
    { dn_name: 'nocoords' },
    { dn_name: 'near', dn_latitude: 1, dn_longitude: 1 },
  ];

  it('orders nearest first and rows without coordinates last', () => {
    expect(sortOptionsByDistance(rows, origin, 'ascending').map((row) => row.dn_name)).toEqual([
      'near',
      'far',
      'nocoords',
    ]);
  });

  it('reverses the order when descending, still with unknown rows last', () => {
    expect(sortOptionsByDistance(rows, origin, 'descending').map((row) => row.dn_name)).toEqual([
      'far',
      'near',
      'nocoords',
    ]);
  });

  it('accepts numeric strings and the old coordinate keys', () => {
    const mixed = [
      { dn_name: 'string', dn_latitude: '2', dn_longitude: '2' },
      { dn_name: 'legacy', latitude: 1, longitude: 1 },
      { dn_name: 'broken', dn_latitude: 'x', dn_longitude: '' },
    ];

    expect(sortOptionsByDistance(mixed, origin, undefined).map((row) => row.dn_name)).toEqual([
      'legacy',
      'string',
      'broken',
    ]);
  });

  it('leaves the synced rows untouched', () => {
    const before = JSON.stringify(rows);
    sortOptionsByDistance(rows, origin, 'ascending');
    expect(JSON.stringify(rows)).toBe(before);
  });
});

describe('filterVehicleTypesByBrand', () => {
  const rows = [
    { dn_name: 'Model A', _dn_vehiclebrandid_value: 'brand-a' },
    { dn_name: 'Model B', _dn_vehiclebrandid_value: 'brand-b' },
  ];

  it('returns only the types of the chosen brand', () => {
    expect(filterVehicleTypesByBrand(rows, 'brand-b')).toEqual([rows[1]]);
  });

  it('returns nothing without a brand', () => {
    expect(filterVehicleTypesByBrand(rows, '')).toEqual([]);
  });
});

describe('sortCountryOptions', () => {
  const option = (label: string) => ({ label, value: label });

  it('puts the Netherlands, Belgium and Germany first, then the rest alphabetically', () => {
    expect(
      sortCountryOptions(
        ['Frankrijk', 'Duitsland', 'Oostenrijk', 'België', 'Nederland', 'Albanië'].map(option),
      ).map((item) => item.label),
    ).toEqual(['Nederland', 'België', 'Duitsland', 'Albanië', 'Frankrijk', 'Oostenrijk']);
  });

  it('still recognises the English labels the old app compared against', () => {
    expect(
      sortCountryOptions(['France', 'Germany', 'Belgium', 'Nederland', 'Austria'].map(option)).map(
        (item) => item.label,
      ),
    ).toEqual(['Nederland', 'Belgium', 'Germany', 'Austria', 'France']);
  });
});

describe('buildSelectOptions', () => {
  it('keeps the CRM value next to the label for insurers and lease companies', () => {
    const rows = [
      { name: 'Verzekeraar A', accountid: 'acc-1' },
      { name: 'Leasemaatschappij B', accountid: 'acc-2' },
    ];

    expect(buildSelectOptions(rows, { table: 'account' })).toEqual({
      kind: 'options',
      options: [
        { label: 'Verzekeraar A', value: 'acc-1' },
        { label: 'Leasemaatschappij B', value: 'acc-2' },
      ],
    });
  });

  it('keeps each value when two rows share a label', () => {
    const rows = [
      { name: 'Centraal Beheer', accountid: 'acc-1' },
      { name: 'Centraal Beheer', accountid: 'acc-2' },
    ];

    const result = buildSelectOptions(rows, { table: 'account' });

    expect(result.kind === 'options' && result.options.map((item) => item.value)).toEqual([
      'acc-1',
      'acc-2',
    ]);
  });

  it('orders ordinary option sets as synced, including a zero value', () => {
    const rows = [
      { Text: 'Nee', Value: 0 },
      { Text: 'Ja', Value: 1 },
    ];

    expect(buildSelectOptions(rows, { table: 'dn_yesno' })).toEqual({
      kind: 'options',
      options: [
        { label: 'Nee', value: 0 },
        { label: 'Ja', value: 1 },
      ],
    });
  });

  it('sorts depots by distance when the device has a position', () => {
    const rows = [
      { dn_name: 'Ver', dn_locationid: 'l-1', dn_latitude: 53, dn_longitude: 6 },
      { dn_name: 'Dichtbij', dn_locationid: 'l-2', dn_latitude: 52.1, dn_longitude: 5.1 },
    ];
    const input = {
      table: 'dn_location',
      sortOptions: { orderby: 'distance', direction: 'ascending' },
    };

    const withPosition = buildSelectOptions(rows, {
      ...input,
      currentPosition: { latitude: 52, longitude: 5 },
    });
    const withoutPosition = buildSelectOptions(rows, { ...input, currentPosition: null });

    expect(withPosition.kind === 'options' && withPosition.options.map((o) => o.label)).toEqual([
      'Dichtbij',
      'Ver',
    ]);
    expect(
      withoutPosition.kind === 'options' && withoutPosition.options.map((o) => o.label),
    ).toEqual(['Ver', 'Dichtbij']);
  });

  it('puts the neighbouring countries first in the country table', () => {
    const rows = [
      { dn_name: 'Frankrijk', dn_countryid: 'fr' },
      { dn_name: 'Duitsland', dn_countryid: 'de' },
      { dn_name: 'Nederland', dn_countryid: 'nl' },
    ];

    const result = buildSelectOptions(rows, { table: 'dn_country' });

    expect(result.kind === 'options' && result.options.map((o) => o.value)).toEqual([
      'nl',
      'de',
      'fr',
    ]);
  });

  it('asks for the brand before listing vehicle types', () => {
    const rows = [{ dn_name: 'Golf', dn_vehicletypeid: 't-1', _dn_vehiclebrandid_value: 'vw' }];

    expect(buildSelectOptions(rows, { table: 'dn_vehicletypes', dependencyValue: '' })).toEqual({
      kind: 'needs-dependency',
    });
  });

  it('lists only the vehicle types of the chosen brand', () => {
    const rows = [
      { dn_name: 'Golf', dn_vehicletypeid: 't-1', _dn_vehiclebrandid_value: 'vw' },
      { dn_name: 'Corsa', dn_vehicletypeid: 't-2', _dn_vehiclebrandid_value: 'opel' },
    ];

    expect(buildSelectOptions(rows, { table: 'dn_vehicletypes', dependencyValue: 'opel' })).toEqual(
      { kind: 'options', options: [{ label: 'Corsa', value: 't-2' }] },
    );
  });

  it('reports an empty table instead of an empty list', () => {
    expect(buildSelectOptions([], { table: 'dn_country' })).toEqual({ kind: 'empty' });
    expect(buildSelectOptions([{ dn_name: 'zonder id' }], {})).toEqual({ kind: 'empty' });
  });
});

describe('filterSelectOptions', () => {
  const options = [
    { label: 'Nederland', value: 'nl' },
    { label: 'Denemarken', value: 'dk' },
  ];

  it('searches case-insensitively from the second character on', () => {
    expect(filterSelectOptions(options, 'NE')).toEqual(options);
    expect(filterSelectOptions(options, 'lan')).toEqual([options[0]]);
  });

  it('shows everything for a single character', () => {
    expect(filterSelectOptions(options, 'x')).toEqual(options);
  });
});

describe('pickQuickOptions', () => {
  const options = [
    { label: 'Utrecht', value: 'loc-near' },
    { label: 'Amsterdam', value: 'loc-mid' },
    { label: 'Groningen', value: 'loc-far' },
    { label: 'Maastricht', value: 'loc-south' },
  ];

  it('returns the first N options', () => {
    expect(pickQuickOptions(options, 3, undefined)).toEqual(options.slice(0, 3));
  });

  it('appends the selected option when it falls outside the first N', () => {
    expect(pickQuickOptions(options, 2, 'loc-south')).toEqual([options[0], options[1], options[3]]);
  });

  it('does not duplicate the selected option when it is already in the head', () => {
    expect(pickQuickOptions(options, 3, 'loc-near')).toEqual(options.slice(0, 3));
  });

  it('returns an empty list for a non-positive count', () => {
    expect(pickQuickOptions(options, 0, 'loc-near')).toEqual([]);
  });
});

describe('selectedOptionAnswer', () => {
  it('stores the CRM value and shows the label', () => {
    expect(selectedOptionAnswer({ label: 'Nederland', value: 'nl' }, 'dn_country')).toEqual({
      value: 'nl',
      displayValue: 'Nederland',
      table: 'dn_country',
    });
  });
});

describe('findBooleanSelectRow', () => {
  it('matches the stored boolean first', () => {
    const rows = [
      { Text: 'Ja', Value: true },
      { Text: 'Nee', Value: false },
    ];
    expect(findBooleanSelectRow(rows, true, { yes: 'Ja', no: 'Nee' })).toBe(rows[0]);
  });

  it('falls back to the localized yes/no label', () => {
    const rows = [
      { Text: 'Ja', Value: 1 },
      { Text: 'Nee', Value: 0 },
    ];
    expect(findBooleanSelectRow(rows, true, { yes: 'Ja', no: 'Nee' })).toBe(rows[0]);
    expect(findBooleanSelectRow(rows, false, { yes: 'Ja', no: 'Nee' })).toBe(rows[1]);
  });
});

describe('buildBooleanSelectAnswer', () => {
  const labels = { yesLabel: 'Ja', noLabel: 'Nee' };

  it('uses the synced option code for optional yes/no', () => {
    const rows = [
      { Text: 'Ja', Value: 1 },
      { Text: 'Nee', Value: 0 },
    ];

    expect(buildBooleanSelectAnswer(rows, true, { ...labels, table: 'dn_optionalyesno' })).toEqual({
      value: 1,
      displayValue: 'Ja',
      table: 'dn_optionalyesno',
    });
    expect(buildBooleanSelectAnswer(rows, false, { ...labels, table: 'dn_optionalyesno' })).toEqual(
      { value: 0, displayValue: 'Nee', table: 'dn_optionalyesno' },
    );
  });

  it('keeps the boolean when the matched row has no value', () => {
    expect(
      buildBooleanSelectAnswer([{ Text: 'Ja' }], true, { ...labels, table: 'dn_truefalse' }),
    ).toEqual({ value: true, displayValue: 'Ja', table: 'dn_truefalse' });
  });

  it('keeps raw booleans for dn_truefalse without synced rows', () => {
    expect(buildBooleanSelectAnswer([], false, { ...labels, table: 'dn_truefalse' })).toEqual({
      value: false,
      displayValue: 'Nee',
      table: 'dn_truefalse',
    });
  });

  it('falls back to 1 and 0 for optional yes/no without synced rows', () => {
    expect(buildBooleanSelectAnswer([], true, { ...labels, table: 'dn_optionalyesno' })).toEqual({
      value: 1,
      displayValue: 'Ja',
      table: 'dn_optionalyesno',
    });
    expect(buildBooleanSelectAnswer([], false, { ...labels, table: 'dn_optionalyesno' })).toEqual({
      value: 0,
      displayValue: 'Nee',
      table: 'dn_optionalyesno',
    });
  });

  it('clears the answer when an optional toggle is reset', () => {
    expect(buildBooleanSelectAnswer([], null, { ...labels, table: 'dn_optionalyesno' })).toEqual({
      value: '',
      displayValue: '',
      table: 'dn_optionalyesno',
    });
  });
});

describe('booleanSelectState', () => {
  it('reads yes, no or not chosen from the stored answer', () => {
    expect(booleanSelectState({ value: true, displayValue: 'Ja' })).toBe(true);
    expect(booleanSelectState({ value: 1, displayValue: 'Ja' })).toBe(true);
    expect(booleanSelectState({ value: false, displayValue: 'Nee' })).toBe(false);
    expect(booleanSelectState({ value: 0, displayValue: 'Nee' })).toBe(false);
    expect(booleanSelectState({ value: '', displayValue: '' })).toBeNull();
    expect(booleanSelectState(undefined)).toBeNull();
  });
});
