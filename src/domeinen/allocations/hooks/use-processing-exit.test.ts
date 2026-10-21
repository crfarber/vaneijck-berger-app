import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./use-processing-exit.ts', import.meta.url), 'utf8');

describe('useProcessingExit source', () => {
  it('invalidates vehicle releases after a release-item exit', () => {
    expect(source).toContain('vehicleReleaseKeys');
    expect(source).toContain('input.isReleaseItem === true');
    expect(source).toContain('invalidateQueries({ queryKey: vehicleReleaseKeys.list() })');
  });
});
