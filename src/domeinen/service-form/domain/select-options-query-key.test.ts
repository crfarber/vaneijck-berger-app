import { describe, expect, it } from 'vitest';
import { serviceFormSelectOptionsQueryKey } from './select-options-query-key';
import type { ServiceFormField } from './types';

const field = {
  key: '_dn_locationid_value',
  table: 'dn_location',
  sortOptions: { orderby: 'distance', direction: 'ascending' },
} as Pick<ServiceFormField, 'key' | 'table' | 'sortOptions'>;

describe('serviceFormSelectOptionsQueryKey', () => {
  it('is stable for the same field and dependency', () => {
    expect(serviceFormSelectOptionsQueryKey(field, undefined)).toEqual(
      serviceFormSelectOptionsQueryKey(field, undefined),
    );
  });

  it('changes when the dependency or sort changes', () => {
    const withBrand = serviceFormSelectOptionsQueryKey(field, 'vw');
    const otherSort = serviceFormSelectOptionsQueryKey(
      { ...field, sortOptions: { orderby: 'name', direction: 'ascending' } },
      undefined,
    );
    expect(withBrand).not.toEqual(serviceFormSelectOptionsQueryKey(field, undefined));
    expect(otherSort).not.toEqual(serviceFormSelectOptionsQueryKey(field, undefined));
  });
});
