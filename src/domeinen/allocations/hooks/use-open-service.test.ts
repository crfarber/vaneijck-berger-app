import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./use-open-service.ts', import.meta.url), 'utf8');

describe('useOpenService source', () => {
  it('routes through resolveOpenServiceRoute instead of inlining status checks', () => {
    expect(source).toContain('resolveOpenServiceRoute');
    expect(source).toContain("route === 'blocked'");
    expect(source).toContain("route === 'finish'");
  });

  it('hydrates before preview when the list row still lacks a service id', () => {
    expect(source).toContain('resolvePreviewService');
    expect(source).toContain('openPreview = async');
    expect(source).toMatch(/if \(serviceId\) \{\s*openForm\(serviceId, true\)/);
  });
});
