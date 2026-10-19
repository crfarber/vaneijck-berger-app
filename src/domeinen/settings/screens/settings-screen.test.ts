import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./settings-screen.tsx', import.meta.url), 'utf8');

describe('settings screen', () => {
  it('opens the unit overview when managing the allocation unit', () => {
    expect(source).toContain("route: '/unit'");
    expect(source).toContain("params: { returnTo: 'allocation-unit-management' }");
    expect(source).toContain("router.push({ pathname: '/unit', params: item.params })");
    expect(source).not.toContain("'/allocation-unit-management'");
  });

  it('hides sync and debug until the worker identity unlocks them', () => {
    expect(source).toContain('requiresUnlock: true');
    expect(source).toContain('onIdentityPress={onIdentityPress}');
    expect(source).toContain('registerDeveloperMenuTap');
  });
});
