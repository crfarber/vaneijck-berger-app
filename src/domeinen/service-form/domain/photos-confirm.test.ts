import { describe, expect, it } from 'vitest';
import { needsPhotoConfirmation } from './photos-confirm';

describe('needsPhotoConfirmation', () => {
  it('is false when the phase has no mandatory photos', () => {
    expect(needsPhotoConfirmation([], [])).toBe(false);
  });

  it('is true when mandatory photos exist but none were taken', () => {
    expect(needsPhotoConfirmation(['front', 'side'], [])).toBe(true);
  });

  it('is false once at least one photo is present', () => {
    expect(needsPhotoConfirmation(['front'], ['front'])).toBe(false);
  });

  it('requires a photo for every mandatory position rather than any one photo', () => {
    expect(needsPhotoConfirmation(['links-voor', 'rechts-achter'], ['links-voor'])).toBe(true);
    expect(
      needsPhotoConfirmation(['links-voor', 'rechts-achter'], ['links-voor', 'rechts-achter']),
    ).toBe(false);
  });

  it('requires a matching photo for each repeated position', () => {
    expect(needsPhotoConfirmation(['links-voor', 'links-voor'], ['links-voor'])).toBe(true);
    expect(needsPhotoConfirmation(['links-voor', 'links-voor'], ['links-voor', 'links-voor'])).toBe(
      false,
    );
  });
});
