import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8');

describe('ServicePhotosOverviewRoute', () => {
  it('resolves the service through useProcessingService and reads locationId', () => {
    expect(source).toContain('useProcessingService');
    expect(source).toContain('locationId');
    expect(source).toContain('processing.scopeId');
  });
});
