import { describe, expect, it } from 'vitest';
import { ANDROID_GLASS_BACKGROUND, screenFooterBackground } from './screen-footer-background';

const GLASS = 'rgba(255, 255, 255, 0.15)';

describe('screenFooterBackground', () => {
  it('keeps the light glass on iOS, where the system blurs the content behind it', () => {
    expect(screenFooterBackground(GLASS, 'ios')).toBe(GLASS);
  });

  // Regression: Android cannot blur the scroll content, so the 15% glass left the form fields
  // readable straight through the footer actions.
  it('makes the glass nearly opaque on Android so the actions stay readable', () => {
    expect(screenFooterBackground(GLASS, 'android')).toBe(ANDROID_GLASS_BACKGROUND);
  });

  it('leaves a transparent footer alone, which blurs the map background instead', () => {
    expect(screenFooterBackground('transparent', 'android')).toBe('transparent');
    expect(screenFooterBackground('transparent', 'ios')).toBe('transparent');
  });
});
