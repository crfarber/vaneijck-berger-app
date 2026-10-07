import { describe, expect, it } from 'vitest';
import { initialAddressSearchQuery } from './initial-address-search';

describe('initialAddressSearchQuery', () => {
  it('returns the trimmed query only when the search sheet is open and has enough text', () => {
    expect(initialAddressSearchQuery(true, '  Teststraat 1  ')).toBe('Teststraat 1');
    expect(initialAddressSearchQuery(true, ' ')).toBeNull();
    expect(initialAddressSearchQuery(false, 'Teststraat 1')).toBeNull();
  });
});
