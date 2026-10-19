import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./signature-capture-sheet.tsx', import.meta.url), 'utf8');

describe('signature capture sheet', () => {
  it('keeps the pad and buttons inside the safe area from the first frame', () => {
    expect(source).toContain('const insets = useSafeAreaInsets();');
    expect(source).toContain('paddingTop: insets.top');
    expect(source).toContain('paddingBottom: insets.bottom');
    expect(source).toContain('paddingLeft: insets.left');
    expect(source).toContain('paddingRight: insets.right');
  });

  it('does not rely on a measuring SafeAreaView, which reads zero insets while the modal slides in', () => {
    expect(source).not.toContain('<SafeAreaView');
  });

  it('draws behind the status and navigation bar on Android so the insets match iOS', () => {
    expect(source).toMatch(/<Modal[^>]*statusBarTranslucent[^>]*navigationBarTranslucent/);
  });
});
