import { describe, expect, it } from 'vitest';
import { PHOTO_CATEGORY, type PhotoPosition } from './types';
import { photoPositionFromRouteParam, photoPositionToRouteParam } from './photo-position-route';

describe('photo position route parameters', () => {
  it('round-trips a simple position', () => {
    const position: PhotoPosition = { category: PHOTO_CATEGORY.DASHBOARD };

    expect(photoPositionFromRouteParam(photoPositionToRouteParam(position))).toEqual(position);
  });

  it('round-trips an exterior angle', () => {
    const position: PhotoPosition = { category: PHOTO_CATEGORY.EXTERIOR, angle: 'links-voor' };

    expect(photoPositionFromRouteParam(photoPositionToRouteParam(position))).toEqual(position);
  });

  it('round-trips a tyre position', () => {
    const position: PhotoPosition = { category: PHOTO_CATEGORY.TYRES, tyre: 'rechts-achter' };

    expect(photoPositionFromRouteParam(photoPositionToRouteParam(position))).toEqual(position);
  });

  it('rejects malformed or incomplete route parameters', () => {
    expect(photoPositionFromRouteParam(undefined)).toBeNull();
    expect(photoPositionFromRouteParam('{')).toBeNull();
    expect(photoPositionFromRouteParam('{"category":"EXTERIOR"}')).toBeNull();
    expect(photoPositionFromRouteParam('{"category":"UNKNOWN"}')).toBeNull();
  });
});
