import { describe, expect, it } from 'vitest';
import { cameraForFocus, cameraForPoints, NETHERLANDS_CENTER } from './map-camera';

describe('cameraForFocus', () => {
  it('centres on the point at street zoom, closer than the single-pin overview', () => {
    const point = { latitude: 52.09, longitude: 5.12 };
    const camera = cameraForFocus(point);
    expect(camera).toEqual({ coordinates: point, zoom: 16 });
    expect(camera.zoom).toBeGreaterThan(cameraForPoints([point]).zoom);
  });
});

describe('cameraForPoints', () => {
  it('falls back to the Netherlands centre when there are no points', () => {
    expect(cameraForPoints([])).toEqual({
      coordinates: NETHERLANDS_CENTER,
      zoom: 7,
    });
  });

  it('uses an explicit fallback centre when provided', () => {
    const fallback = { latitude: 51.5, longitude: 4.5 };
    expect(cameraForPoints([], fallback)).toEqual({
      coordinates: fallback,
      zoom: 7,
    });
  });

  it('centres on a single point at neighbourhood zoom', () => {
    expect(cameraForPoints([{ latitude: 52.09, longitude: 5.12 }])).toEqual({
      coordinates: { latitude: 52.09, longitude: 5.12 },
      zoom: 12,
    });
  });

  it('frames multiple points with a centre and enough zoom-out to keep both on screen', () => {
    const camera = cameraForPoints([
      { latitude: 52.09, longitude: 5.12 },
      { latitude: 52.39, longitude: 4.9 },
    ]);
    expect(camera.coordinates.latitude).toBeCloseTo(52.24, 5);
    expect(camera.coordinates.longitude).toBeCloseTo(5.01, 5);
    expect(camera.zoom).toBeGreaterThanOrEqual(5);
    expect(camera.zoom).toBeLessThanOrEqual(14);
    expect(camera.zoom).toBeLessThan(12);
  });

  it('does not over-zoom when the berger is close to the incident', () => {
    const camera = cameraForPoints([
      { latitude: 52.1, longitude: 5.1 },
      { latitude: 52.101, longitude: 5.101 },
    ]);
    expect(camera.coordinates.latitude).toBeCloseTo(52.1005, 5);
    expect(camera.coordinates.longitude).toBeCloseTo(5.1005, 5);
    // Minimum span (~0.1°) × padding keeps both pins and the blue dot in view.
    expect(camera.zoom).toBeLessThanOrEqual(12);
    expect(camera.zoom).toBeGreaterThanOrEqual(5);
  });

  it('uses the same multi-point floor when points coincide', () => {
    const camera = cameraForPoints([
      { latitude: 52.1, longitude: 5.1 },
      { latitude: 52.1, longitude: 5.1 },
    ]);
    expect(camera.coordinates).toEqual({ latitude: 52.1, longitude: 5.1 });
    expect(camera.zoom).toBeLessThanOrEqual(12);
  });
});
