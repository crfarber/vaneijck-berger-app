import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./glass-card.tsx', import.meta.url), 'utf8');

describe('glass card', () => {
  it('places a non-interactive blur behind its content', () => {
    expect(source).toMatch(/<BlurView\s+pointerEvents="none"\s+intensity=\{35\}/);
    expect(source).toMatch(/style=\{StyleSheet.absoluteFill\}\s*\/>\s*\{children\}/);
    expect(source).toContain("overflow: 'hidden'");
  });

  it('blurs the map background on Android', () => {
    expect(source).toContain('useContext(MapBackgroundBlurContext)');
    expect(source).toContain("blurMethod={blurTarget ? 'dimezisBlurView' : 'none'}");
  });
});
