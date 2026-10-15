import { describe, expect, it } from 'vitest';
import {
  PHOTO_ZOOM_DOUBLE_TAP,
  PHOTO_ZOOM_MAX,
  PHOTO_ZOOM_MIN,
  clampPhotoPan,
  clampPhotoZoom,
  nextDoubleTapZoom,
} from './photo-zoom';

describe('clampPhotoZoom', () => {
  it('keeps the zoom between the full photo and the maximum', () => {
    expect(clampPhotoZoom(0.4)).toBe(PHOTO_ZOOM_MIN);
    expect(clampPhotoZoom(2)).toBe(2);
    expect(clampPhotoZoom(9)).toBe(PHOTO_ZOOM_MAX);
  });

  it('falls back to the full photo for an invalid pinch value', () => {
    expect(clampPhotoZoom(Number.NaN)).toBe(PHOTO_ZOOM_MIN);
    expect(clampPhotoZoom(Number.POSITIVE_INFINITY)).toBe(PHOTO_ZOOM_MIN);
  });
});

describe('clampPhotoPan', () => {
  it('does not move an unzoomed photo', () => {
    expect(clampPhotoPan(120, 1, 400)).toBe(0);
  });

  it('lets a zoomed photo move at most to its own edge', () => {
    expect(clampPhotoPan(50, 2, 400)).toBe(50);
    expect(clampPhotoPan(500, 2, 400)).toBe(200);
    expect(clampPhotoPan(-500, 2, 400)).toBe(-200);
  });

  it('ignores an invalid offset', () => {
    expect(clampPhotoPan(Number.NaN, 2, 400)).toBe(0);
  });
});

describe('nextDoubleTapZoom', () => {
  it('zooms in from the full photo and back out when zoomed', () => {
    expect(nextDoubleTapZoom(PHOTO_ZOOM_MIN)).toBe(PHOTO_ZOOM_DOUBLE_TAP);
    expect(nextDoubleTapZoom(1.6)).toBe(PHOTO_ZOOM_MIN);
  });
});
