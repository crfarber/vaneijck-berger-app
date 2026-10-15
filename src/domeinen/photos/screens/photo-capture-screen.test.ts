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

  it('saves the photo for the current service before navigating back', () => {
    expect(source).toMatch(/await photoService\.capture\(\{\s*serviceId,/);
    expect(source.indexOf('await photoService.capture(')).toBeLessThan(
      source.indexOf('router.navigate('),
    );
  });
});
