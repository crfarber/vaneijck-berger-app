import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('./allocation-unit-management-screen.tsx', import.meta.url),
  'utf8',
);

describe('allocation unit management screen', () => {
  it('confirms cancellation and blocks it while active work exists', () => {
    expect(source).toContain('await confirm({');
    expect(source).toContain('disabled={!hasUnit || hasActiveWork}');
    expect(source).toContain('if (!hasUnit || hasActiveWork || cancelling)');
  });

  it('opens the existing vehicle and end-time flows', () => {
    expect(source).toContain("router.push('/unit?returnTo=allocation-unit-management')");
    expect(source).toContain(
      "router.push('/unit?mode=extend&returnTo=allocation-unit-management')",
    );
  });
});
