import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./toolbar-button.tsx', import.meta.url), 'utf8');

describe('toolbar button glass appearance', () => {
  it('provides a non-interactive background blur', () => {
    expect(source).toContain("import { BlurView } from 'expo-blur'");
    expect(source).toMatch(/<BlurView\s+pointerEvents="none"\s+intensity=\{35\}/);
  });

  it('clips only the glass background so the badge remains visible', () => {
    expect(source).toMatch(/glass:\s*\{[^}]*overflow: 'hidden'/);
    expect(source).toMatch(/<\/View>\s*\{children\}\s*\{badge !== null/);
    expect(source).not.toMatch(/base:\s*\{[^}]*overflow:/);
  });

  it('retains translucent status and selection colors', () => {
    expect(source).toContain('defaultTint: { backgroundColor: colors.brandDark }');
    expect(source).toContain('`${colors.danger}BF`');
    expect(source).toContain('`${colors.success}BF`');
    expect(source).toContain('`${colors.brand}BF`');
  });
});
