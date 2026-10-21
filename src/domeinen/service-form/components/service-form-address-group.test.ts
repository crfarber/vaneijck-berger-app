import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./service-form-address-group.tsx', import.meta.url), 'utf8');

describe('ServiceFormAddressGroup heading', () => {
  it('shows a modest title from the group label above the address fields', () => {
    expect(source).toContain('group.config.label');
    expect(source).toContain("t('serviceForm.address.title')");
    expect(source).toContain('<Text style={styles.title}>{title}</Text>');
    expect(source).toContain('typography.label');
    expect(source).not.toContain('typography.header');
  });
});
