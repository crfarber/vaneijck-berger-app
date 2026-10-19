import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Lives outside `src/app`: Expo Router would otherwise treat a colocated `index.test.ts` as a
// route and Metro would try to bundle `node:fs`.
const source = readFileSync(new URL('../../../app/(app)/unit/index.tsx', import.meta.url), 'utf8');

describe('unit overview route', () => {
  it('offers cancellation only when opened from settings', () => {
    expect(source).toContain("returnTo === 'allocation-unit-management'");
    expect(source).toContain('onCancel={fromSettings ? () => void cancelUnit() : undefined}');
    expect(source).toContain("router.replace('/settings')");
  });

  it('returns to the same overview after a change started from settings', () => {
    expect(source).toContain(
      "pathname: '/unit', params: { returnTo: 'allocation-unit-management' }",
    );
    expect(source).toContain("returnTo: 'allocation-unit-management'");
  });
});
