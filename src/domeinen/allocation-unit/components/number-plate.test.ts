import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./number-plate.tsx', import.meta.url), 'utf8');

describe('number plate', () => {
  it('supports an external vehicle without a fleet vehicle number', () => {
    expect(source).toContain('vehicleNumber?: string');
    expect(source).toContain('showDutchChrome && vehicleNumber ? (');
  });

  it('keeps plate shape for foreign chrome: blue strip without flag, non-yellow body', () => {
    expect(source).toContain("chrome?: 'auto' | 'dutch' | 'foreign'");
    expect(source).toContain("chrome === 'foreign'");
    expect(source).toContain('foreignPlateBody');
    expect(source).toContain('flagSpacer');
    expect(source).toContain('showDutchChrome ? (');
    expect(source).toContain('<Image source={qrflag}');
  });
});
