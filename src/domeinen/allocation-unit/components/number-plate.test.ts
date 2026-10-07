import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./number-plate.tsx', import.meta.url), 'utf8');

describe('number plate', () => {
  it('supports an external vehicle without a fleet vehicle number', () => {
    expect(source).toContain('vehicleNumber?: string');
    expect(source).toContain('{vehicleNumber ? (');
  });
});
