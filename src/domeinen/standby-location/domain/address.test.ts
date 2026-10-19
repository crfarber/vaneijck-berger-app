import { describe, expect, it } from 'vitest';
import { formatStandbyAddressShort } from './address';

describe('formatStandbyAddressShort', () => {
  it('formats street, house number and city', () => {
    expect(
      formatStandbyAddressShort({
        street: 'Diemerkade',
        houseNo: '12',
        city: 'DIEMEN',
        name: 'Ignored when address exists',
      }),
    ).toBe('Diemerkade 12, DIEMEN');
  });

  it('falls back to the name', () => {
    expect(formatStandbyAddressShort({ name: 'Depot Noord' })).toBe('Depot Noord');
  });

  it('returns empty when nothing is present', () => {
    expect(formatStandbyAddressShort({})).toBe('');
  });
});
