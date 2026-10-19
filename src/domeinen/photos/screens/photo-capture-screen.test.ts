import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./photo-capture-screen.tsx', import.meta.url), 'utf8');

describe('photo capture screen', () => {
  it('does not load or decode existing photos when opening or saving a capture', () => {
    expect(source).not.toContain('useServicePhotos');
    expect(source).not.toContain('displayUri');
    expect(source).not.toContain('refresh(');
    expect(source).toContain('usePhotoService()');
  });

  it('saves the photo, then pops back to the existing overview instead of opening a new one', () => {
    expect(source).toMatch(/await photoService\.capture\(\{\s*serviceId,/);
    expect(source.indexOf('await photoService.capture(')).toBeLessThan(
      source.indexOf('returnToOverview();'),
    );
    expect(source).toContain('useReturnToPhotoOverview(routeParams)');
    expect(source).not.toContain('router.navigate(');
    expect(source).not.toContain('router.canDismiss()');
  });

  it('labels a retake or override capture as replacing, not as an extra photo', () => {
    expect(source).toContain('isReplacing');
    expect(source).toContain("t('photos.replaceCapture'");
    expect(source).toContain('Boolean(replacePhotoId) || overrideExisting');
  });
});
