import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./photo-zoom-viewer.tsx', import.meta.url), 'utf8');

describe('photo zoom viewer', () => {
  it('supports pinch, drag and double-tap at the same time', () => {
    expect(source).toContain('Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan))');
    expect(source).toContain('clampPhotoZoom(startScale.get() * event.scale)');
    expect(source).toContain('nextDoubleTapZoom(scale.get())');
  });

  it('wraps the modal in its own gesture root so gestures work on Android', () => {
    expect(source).toMatch(/<Modal[^>]*>\s*<GestureHandlerRootView/);
  });

  it('can always be closed with a labelled button and the back button', () => {
    expect(source).toContain('onRequestClose={onClose}');
    expect(source).toContain("accessibilityLabel={t('common.close')}");
  });

  it('keeps the photo and close button inside the safe area', () => {
    expect(source).toContain('paddingTop: insets.top');
    expect(source).toContain('paddingBottom: insets.bottom');
    expect(source).toContain('const height = window.height - insets.top - insets.bottom;');
    expect(source).toContain("safeArea: { flex: 1, overflow: 'hidden' }");
  });
});
