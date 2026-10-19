import { describe, expect, it } from 'vitest';
import type { ServiceFormField } from './types';
import {
  buildClearedPersonNameAnswers,
  buildPersonNameAnswers,
  buildPersonNameGroup,
  buildPersonNameRenderItems,
  buildPersonNameSummary,
  findPersonNameGroupInFields,
  hasAppliedPersonNameAnswers,
  partitionFieldsAroundPersonNameGroups,
  previewPersonNameParse,
  readPersonNameGroup,
  toPersonNameFieldMapping,
} from './person-name-entry';

const field = (
  key: string,
  raw: ServiceFormField['raw'] = {},
  extras: Partial<ServiceFormField> = {},
): ServiceFormField => ({
  id: key,
  key,
  label: key,
  type: extras.type ?? 'string',
  table: extras.table,
  readOnly: false,
  optional: true,
  autocomplete: false,
  validations: [],
  raw,
});

const validGroupRaw = {
  person_group: {
    id: 'driver',
    label: [
      { 'language-code': 1043, value: 'Bestuurder' },
      { 'language-code': 1044, value: 'Driver' },
    ],
    flow: 'person_v1' as const,
    confirmName: true,
    gate: 'dn_driverstatecode',
    fields: {
      salutation: 'dn_driversalutationcode',
      initials: 'dn_driverinitials',
      firstName: 'dn_driverfirstname',
      middleName: 'dn_drivermiddlename',
      lastName: 'dn_driverlastname',
      phone1: 'dn_drivertelephonenumber1',
      email: 'dn_driveremail',
    },
    addressGroupId: 'dn_driverpostalcode',
    copyFrom: null,
  },
};

describe('readPersonNameGroup', () => {
  it('reads a valid person_group and keeps name fields', () => {
    expect(readPersonNameGroup(validGroupRaw)).toEqual({
      id: 'driver',
      label: { nl: 'Bestuurder', en: 'Driver' },
      fields: {
        salutation: 'dn_driversalutationcode',
        initials: 'dn_driverinitials',
        firstName: 'dn_driverfirstname',
        middleName: 'dn_drivermiddlename',
        lastName: 'dn_driverlastname',
      },
      flow: 'person_v1',
      confirmName: true,
      gate: 'dn_driverstatecode',
      phone1: 'dn_drivertelephonenumber1',
      email: 'dn_driveremail',
      addressGroupId: 'dn_driverpostalcode',
      copyFrom: null,
    });
  });

  it('returns null for an unknown flow', () => {
    expect(
      readPersonNameGroup({
        person_group: {
          ...validGroupRaw.person_group,
          flow: 'other',
        },
      }),
    ).toBeNull();
  });

  it('returns null when lastName is missing', () => {
    expect(
      readPersonNameGroup({
        person_group: {
          id: 'driver',
          flow: 'person_v1',
          fields: { salutation: 'dn_driversalutationcode' },
        },
      }),
    ).toBeNull();
  });

  it('defaults confirmName when omitted', () => {
    const result = readPersonNameGroup({
      person_group: {
        id: 'driver',
        flow: 'person_v1',
        fields: { lastName: 'dn_driverlastname' },
      },
    });
    expect(result).toMatchObject({ confirmName: true });
  });
});

describe('buildPersonNameGroup / render items', () => {
  it('builds a group when marker and lastName exist', () => {
    const salutation = field('dn_driversalutationcode', validGroupRaw, {
      type: 'select',
      table: 'dn_salutation',
    });
    const lastName = field('dn_driverlastname');
    const initials = field('dn_driverinitials');
    const middle = field('dn_drivermiddlename');
    const phone = field('dn_drivertelephonenumber1');
    const group = buildPersonNameGroup(
      salutation,
      new Map([salutation, lastName, initials, middle, phone].map((item) => [item.key, item])),
    );
    expect(group?.config.id).toBe('driver');
    expect(group?.orderedFields.map((item) => item.key)).toEqual([
      'dn_driversalutationcode',
      'dn_driverinitials',
      'dn_drivermiddlename',
      'dn_driverlastname',
    ]);
  });

  it('returns null when lastName field is absent from the section', () => {
    const salutation = field('dn_driversalutationcode', validGroupRaw);
    expect(buildPersonNameGroup(salutation, new Map([[salutation.key, salutation]]))).toBeNull();
  });

  it('hides consumed name fields and leaves phone as a loose field', () => {
    const salutation = field('dn_driversalutationcode', validGroupRaw, {
      type: 'select',
      table: 'dn_salutation',
    });
    const lastName = field('dn_driverlastname');
    const phone = field('dn_drivertelephonenumber1');
    const items = buildPersonNameRenderItems([salutation, lastName, phone]);
    expect(items).toEqual([
      { kind: 'person-name', group: expect.objectContaining({ anchor: salutation }) },
      { kind: 'field', field: phone },
    ]);
    expect(findPersonNameGroupInFields([salutation, lastName, phone])?.anchor.key).toBe(
      'dn_driversalutationcode',
    );
  });

  it('partitions fields around the person-name group for section rendering', () => {
    const before = field('dn_driverstatecode');
    const salutation = field('dn_driversalutationcode', validGroupRaw, {
      type: 'select',
      table: 'dn_salutation',
    });
    const lastName = field('dn_driverlastname');
    const phone = field('dn_drivertelephonenumber1');
    expect(partitionFieldsAroundPersonNameGroups([before, salutation, lastName, phone])).toEqual([
      { kind: 'fields', fields: [before] },
      { kind: 'person-name', group: expect.objectContaining({ anchor: salutation }) },
      { kind: 'fields', fields: [phone] },
    ]);
  });
});

describe('buildPersonNameAnswers / clear / summary', () => {
  const mapping = toPersonNameFieldMapping(validGroupRaw.person_group.fields);
  const options = [
    { label: 'De heer', value: 1 },
    { label: 'Mevrouw', value: 2 },
  ];

  it('clears all mapped name roles', () => {
    expect(buildClearedPersonNameAnswers(mapping, 'Kies…')).toEqual({
      dn_driversalutationcode: { value: '', displayValue: 'Kies…' },
      dn_driverinitials: { value: '', displayValue: '' },
      dn_driverfirstname: { value: '', displayValue: '' },
      dn_drivermiddlename: { value: '', displayValue: '' },
      dn_driverlastname: { value: '', displayValue: '' },
    });
  });

  it('applies a parsed free-text name onto CRM answers', () => {
    const { parsed } = previewPersonNameParse('Dhr. Jan de Vries', options);
    expect(
      buildPersonNameAnswers(mapping, parsed, {
        salutationOptions: options,
        salutationTable: 'dn_salutation',
        pleaseSelectLabel: 'Kies…',
      }),
    ).toEqual({
      dn_driversalutationcode: { value: 1, displayValue: 'De heer', table: 'dn_salutation' },
      dn_driverinitials: { value: 'J.', displayValue: 'J.' },
      dn_driverfirstname: { value: 'Jan', displayValue: 'Jan' },
      dn_drivermiddlename: { value: 'de', displayValue: 'de' },
      dn_driverlastname: { value: 'Vries', displayValue: 'Vries' },
    });
  });

  it('detects applied last name and builds a summary', () => {
    const answers = {
      dn_driversalutationcode: { value: 1, displayValue: 'De heer', table: 'dn_salutation' },
      dn_driverlastname: { value: 'Vries', displayValue: 'Vries' },
    };
    expect(hasAppliedPersonNameAnswers(mapping, answers, 'Kies…')).toBe(true);
    expect(buildPersonNameSummary(mapping, answers, 'Kies…')).toBe('De heer · Vries');
  });
});
