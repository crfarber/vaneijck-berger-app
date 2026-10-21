import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./permission-disclosure-screen.tsx', import.meta.url), 'utf8');

describe('PermissionDisclosureScreen', () => {
  it('re-reads permission after returning from system settings before marking the step seen', () => {
    expect(source).toContain("AppState.addEventListener('change'");
    expect(source).toContain('awaitingSettingsReturn');
    expect(source).toContain('shouldCompleteDisclosureStep');
    expect(source).toContain('Do not markSeen here');
  });
});
