import { describe, expect, it } from 'vitest';
import {
  ANDROID_ZOOM_2X,
  androidZoomPresets,
  clampCameraZoom,
  iosZoomPresetsFromLenses,
} from './camera-zoom';

describe('clampCameraZoom', () => {
  it('clamps to the 0–1 range', () => {
    expect(clampCameraZoom(-0.2)).toBe(0);
    expect(clampCameraZoom(0.4)).toBe(0.4);
    expect(clampCameraZoom(1.5)).toBe(1);
    expect(clampCameraZoom(Number.NaN)).toBe(0);
  });
});

describe('iosZoomPresetsFromLenses', () => {
  it('maps English ultra-wide, wide and telephoto names', () => {
    expect(
      iosZoomPresetsFromLenses(['Back Ultra Wide Camera', 'Back Camera', 'Back Telephoto Camera']),
    ).toEqual([
      { label: '0.5', zoom: 0, lens: 'Back Ultra Wide Camera' },
      { label: '1', zoom: 0, lens: 'Back Camera' },
      { label: '2', zoom: 0, lens: 'Back Telephoto Camera' },
    ]);
  });

  it('maps Dutch lens names and a 3× telephoto label when present', () => {
    expect(
      iosZoomPresetsFromLenses([
        'Ultra-groothoekcamera achter',
        'Groothoekcamera achter',
        'Telefotocamera 3x achter',
      ]),
    ).toEqual([
      { label: '0.5', zoom: 0, lens: 'Ultra-groothoekcamera achter' },
      { label: '1', zoom: 0, lens: 'Groothoekcamera achter' },
      { label: '3', zoom: 0, lens: 'Telefotocamera 3x achter' },
    ]);
  });

  it('omits 0.5× when there is no ultra-wide lens', () => {
    expect(iosZoomPresetsFromLenses(['Back Camera'])).toEqual([
      { label: '1', zoom: 0, lens: 'Back Camera' },
    ]);
  });

  it('returns an empty list when the device reports no lenses', () => {
    expect(iosZoomPresetsFromLenses([])).toEqual([]);
  });
});

describe('androidZoomPresets', () => {
  it('exposes 1× and 2× digital presets only', () => {
    expect(androidZoomPresets()).toEqual([
      { label: '1', zoom: 0, lens: null },
      { label: '2', zoom: ANDROID_ZOOM_2X, lens: null },
    ]);
    expect(ANDROID_ZOOM_2X).toBeCloseTo(Math.log(2) / Math.log(16));
  });
});
