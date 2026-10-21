import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { unwrapServiceFormDefinitions } from '@/domeinen/service-form';
import { experimentServiceDefinitions } from './experiment-service-definitions';

const experimentDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/diensten/experiment',
);

type RawField = {
  name?: string;
  type?: string;
  person_group?: {
    id?: string;
    label?: Array<{ 'language-code'?: number; value?: string }>;
    fields?: { lastName?: string };
  };
  address_group?: unknown;
};

type PersonBlock = {
  id: string;
  gate: string;
  company: string;
  salutation: string;
  lastName: string;
  phone1: string;
  postal: string;
  expectedLabelNl: string;
  matches: (name: string) => boolean;
};

const PERSON_BLOCKS: readonly PersonBlock[] = [
  {
    id: 'driver',
    gate: 'dn_driverstatecode',
    company: '_dn_driveraccountid_value',
    salutation: 'dn_driversalutationcode',
    lastName: 'dn_driverlastname',
    phone1: 'dn_drivertelephonenumber1',
    postal: 'dn_driverpostalcode',
    expectedLabelNl: 'Bestuurder',
    matches: (name) =>
      name === 'dn_driverstatecode' ||
      name === 'dn_driverstatuscode' ||
      (name.startsWith('dn_driver') && !/license|slicense/i.test(name)) ||
      name === '_dn_drivercountryid_value' ||
      name === '_dn_driveraccountid_value',
  },
  {
    id: 'registrationowner',
    gate: 'dn_alternativeregistrationownercode',
    company: '_dn_registrationowneraccountid_value',
    salutation: 'dn_registrationownersalutationcode',
    lastName: 'dn_registrationownerlastname',
    phone1: 'dn_registrationownertelephonenumber1',
    postal: 'dn_registrationownerpostalcode',
    expectedLabelNl: 'Kentekenhouder',
    matches: (name) =>
      name === 'dn_alternativeregistrationownercode' ||
      name.startsWith('dn_registrationowner') ||
      name === '_dn_registrationownercountryid_value' ||
      name === '_dn_registrationowneraccountid_value',
  },
  {
    id: 'insurer',
    gate: 'dn_alternativeinsurercode',
    company: '_dn_insureraccountid_value',
    salutation: 'dn_insurersalutationcode',
    lastName: 'dn_insurerlastname',
    phone1: 'dn_insurertelephonenumber1',
    postal: 'dn_insurerpostalcode',
    expectedLabelNl: 'Verzekeringsnemer',
    matches: (name) =>
      name === 'dn_alternativeinsurercode' ||
      (name.startsWith('dn_insurer') && !/insurancecompany/i.test(name)) ||
      name === '_dn_insurercountryid_value' ||
      name === '_dn_insureraccountid_value',
  },
];

const collectTabs = (node: unknown, out: RawField[][]): void => {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectTabs(entry, out));
    return;
  }
  if (node === null || typeof node !== 'object') {
    return;
  }
  const record = node as { tabs?: unknown; fields?: unknown };
  if (Array.isArray(record.tabs)) {
    for (const tab of record.tabs) {
      if (tab === null || typeof tab !== 'object') {
        continue;
      }
      const fields = (tab as { fields?: unknown }).fields;
      if (Array.isArray(fields)) {
        out.push(
          fields.filter((field): field is RawField => Boolean(field && typeof field === 'object')),
        );
      }
    }
    return;
  }
  Object.values(node).forEach((value) => collectTabs(value, out));
};

const indexOfName = (names: string[], name: string): number => names.indexOf(name);

describe('experiment service definitions', () => {
  it('loads every JSON file in docs/diensten/experiment, one service code each', () => {
    const fileNames = readdirSync(experimentDirectory)
      .filter((name) => name.endsWith('.json'))
      .sort();
    const fromDisk = fileNames.flatMap((name) =>
      unwrapServiceFormDefinitions(
        JSON.parse(readFileSync(join(experimentDirectory, name), 'utf8')) as unknown,
      ),
    );
    const fromBundle = unwrapServiceFormDefinitions(experimentServiceDefinitions);
    const diskCodes = fromDisk.map((definition) => definition.servicecode);
    const bundleCodes = fromBundle.map((definition) => definition.servicecode);

    expect(experimentServiceDefinitions).toHaveLength(fileNames.length);
    expect(bundleCodes).toEqual(diskCodes);
    expect(new Set(bundleCodes).size).toBe(bundleCodes.length);
    expect(bundleCodes.every((code) => typeof code === 'number')).toBe(true);
  });

  it('keeps person blocks as gate, company, name, contact, then address without Places bars', () => {
    const fileNames = readdirSync(experimentDirectory)
      .filter((name) => name.endsWith('.json'))
      .sort();
    const issues: string[] = [];
    let personBlocksChecked = 0;

    for (const fileName of fileNames) {
      const document = JSON.parse(
        readFileSync(join(experimentDirectory, fileName), 'utf8'),
      ) as unknown;
      const tabs: RawField[][] = [];
      collectTabs(document, tabs);

      for (const fields of tabs) {
        for (const field of fields) {
          if (typeof field.type === 'string' && field.type.toLowerCase() === 'address') {
            issues.push(`${fileName}: Places field ${field.name ?? '?'}`);
          }
        }

        for (const block of PERSON_BLOCKS) {
          const hasBlock = fields.some(
            (field) => field.name === block.lastName || field.name === block.postal,
          );
          if (!hasBlock) {
            continue;
          }
          personBlocksChecked += 1;

          const sequence = fields
            .map((field) => field.name)
            .filter((name): name is string => typeof name === 'string' && block.matches(name));
          const personGroup = fields.find(
            (field) =>
              field.person_group?.id === block.id ||
              field.person_group?.fields?.lastName === block.lastName,
          )?.person_group;
          const hasAddressGroup = fields.some(
            (field) => field.name === block.postal && field.address_group !== undefined,
          );
          const labelNl = personGroup?.label?.find(
            (entry) => entry['language-code'] === 1043,
          )?.value;

          if (!personGroup) {
            issues.push(`${fileName}:${block.id} missing person_group`);
          } else if (labelNl !== block.expectedLabelNl) {
            issues.push(
              `${fileName}:${block.id} label "${labelNl ?? ''}" expected "${block.expectedLabelNl}"`,
            );
          }
          if (fields.some((field) => field.name === block.postal) && !hasAddressGroup) {
            issues.push(`${fileName}:${block.id} missing address_group`);
          }

          const gateAt = indexOfName(sequence, block.gate);
          const companyAt = indexOfName(sequence, block.company);
          const salutationAt = indexOfName(sequence, block.salutation);
          const lastNameAt = indexOfName(sequence, block.lastName);
          const phoneAt = indexOfName(sequence, block.phone1);
          const postalAt = indexOfName(sequence, block.postal);
          const orderChecks: Array<[number, number, string]> = [
            [gateAt, companyAt, 'gate before company'],
            [gateAt, salutationAt, 'gate before salutation'],
            [companyAt, salutationAt, 'company before salutation'],
            [salutationAt, lastNameAt, 'salutation before lastName'],
            [lastNameAt, phoneAt, 'lastName before phone'],
            [phoneAt, postalAt, 'phone before postal'],
            [lastNameAt, postalAt, 'lastName before postal'],
          ];
          for (const [left, right, message] of orderChecks) {
            if (left >= 0 && right >= 0 && left > right) {
              issues.push(`${fileName}:${block.id} ${message}`);
            }
          }
        }
      }
    }

    expect(personBlocksChecked).toBeGreaterThan(0);
    expect(issues).toEqual([]);
  });
});
