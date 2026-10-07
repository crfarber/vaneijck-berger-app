import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const footerSource = readFileSync(new URL('./screen-footer.tsx', import.meta.url), 'utf8');
const screenSource = readFileSync(new URL('./screen.tsx', import.meta.url), 'utf8');
const backgroundSource = readFileSync(new URL('./map-background.tsx', import.meta.url), 'utf8');

describe('screen footer glass appearance', () => {
  it('places a non-interactive blur behind the actions', () => {
    expect(footerSource).toMatch(/<BlurView\s+pointerEvents="none"\s+intensity=\{35\}/);
    expect(footerSource).toMatch(/style=\{StyleSheet.absoluteFill\}\s*\/>\s*\{children\}/);
    expect(footerSource).toContain("backgroundColor: 'transparent'");
    expect(footerSource).toContain("overflow: 'hidden'");
  });

  it('overlays the actions while keeping the last content above them', () => {
    expect(footerSource).toContain('paddingBottom: spacing.md + insets.bottom');
    expect(screenSource).toContain(
      "footerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0 }",
    );
    expect(screenSource).toContain('setFooterHeight(event.nativeEvent.layout.height)');
    expect(screenSource).toContain('paddingBottom: footerHeight + spacing.md');
    expect(screenSource).not.toContain('<BlurView');
  });

  it('provides an Android blur target without including the footer itself', () => {
    expect(backgroundSource).toContain('<BlurTargetView ref={blurTarget}');
    expect(backgroundSource).toMatch(/<\/BlurTargetView>\s*\{children\}/);
    expect(backgroundSource).toContain('<MapBackgroundBlurContext.Provider value={blurTarget}>');
    expect(footerSource).toContain('useContext(MapBackgroundBlurContext)');
    expect(footerSource).toContain('blurTarget={blurTarget}');
    expect(footerSource).toContain("blurMethod={blurTarget ? 'dimezisBlurView' : 'none'}");
  });

  it('does not reveal the map through an opaque screen footer', () => {
    expect(footerSource).toContain(
      "backgroundColor === 'transparent' ? backgroundTarget : undefined",
    );
    expect(footerSource).toContain(
      '{ backgroundColor, paddingBottom: spacing.md + insets.bottom }',
    );
  });
});
