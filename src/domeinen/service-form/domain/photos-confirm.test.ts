import { describe, expect, it } from 'vitest';
import { areServicePhotosUploaded, needsPhotoConfirmation } from './photos-confirm';

describe('areServicePhotosUploaded', () => {
  it('allows services without local photos and services with only confirmed uploads', () => {
    expect(areServicePhotosUploaded([])).toBe(true);
    expect(areServicePhotosUploaded([{ status: 'sent' }, { status: 'sent' }])).toBe(true);
  });

  it.each(['queued', 'failed'] as const)(
    'blocks service submission while a photo is %s, including extra photos',
    (status) => {
      expect(areServicePhotosUploaded([{ status: 'sent' }, { status }])).toBe(false);
    },
  );
});

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
