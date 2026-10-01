import { describe, expect, it } from 'vitest';
import {
  isExteriorAngle,
  isMandatoryPhotoCategory,
  isPhotoCategory,
  isTyrePosition,
  MANDATORY_PHOTO_CATEGORIES,
  photoRequirementName,
  photoTypeKey,
  simplePhotoPosition,
  toImagePosition,
} from './photo-type';

describe('photoTypeKey', () => {
  it('includes the angle or tyre, and uses default for a plain category', () => {
    expect(photoTypeKey({ category: 'EXTERIOR', angle: 'links-voor' })).toBe('EXTERIOR:links-voor');
    expect(photoTypeKey({ category: 'TYRES', tyre: 'rechts-achter' })).toBe('TYRES:rechts-achter');
    expect(photoTypeKey({ category: 'DASHBOARD' })).toBe('DASHBOARD:default');
  });
});

describe('toImagePosition', () => {
  it('sends the Dutch backend label and optional sub-position', () => {
    expect(toImagePosition({ category: 'EXTERIOR', angle: 'achter' })).toEqual({
      name: 'Buitenkant',
      position: 'achter',
    });
    expect(toImagePosition({ category: 'TYRES', tyre: 'links-voor' })).toEqual({
      name: 'Banden',
      position: 'links-voor',
    });
    expect(toImagePosition({ category: 'DASHBOARD' })).toEqual({ name: 'Dashboard' });
  });
});

describe('photoRequirementName', () => {
  it('matches the position names from service definitions', () => {
    expect(photoRequirementName({ category: 'EXTERIOR', angle: 'links-voor' })).toBe('links-voor');
    expect(photoRequirementName({ category: 'TYRES', tyre: 'rechts-achter' })).toBe(
      'banden:rechts-achter',
    );
    expect(photoRequirementName({ category: 'ROOF' })).toBe('dak');
  });
});

describe('guards and simple positions', () => {
  it('recognises known angles, tyres and categories', () => {
    expect(isExteriorAngle('links-voor')).toBe(true);
    expect(isExteriorAngle('nope')).toBe(false);
    expect(isTyrePosition('rechts-voor')).toBe(true);
    expect(isPhotoCategory('ENGINE')).toBe(true);
    expect(isPhotoCategory('OTHER')).toBe(false);
  });

  it('builds a position only for categories without a sub-choice', () => {
    expect(simplePhotoPosition('INTERIOR')).toEqual({ category: 'INTERIOR' });
    expect(simplePhotoPosition('EXTERIOR')).toBeNull();
    expect(simplePhotoPosition('TYRES')).toBeNull();
  });
});

describe('mandatory overview categories', () => {
  it('keeps the four required tiles aligned with the overview flow', () => {
    expect(isMandatoryPhotoCategory('OVERVIEW')).toBe(true);
    expect(isMandatoryPhotoCategory('ROOF')).toBe(true);
    expect(isMandatoryPhotoCategory('INTERIOR')).toBe(true);
    expect(isMandatoryPhotoCategory('DASHBOARD')).toBe(true);
    expect(isMandatoryPhotoCategory('ENGINE')).toBe(false);
    expect(isMandatoryPhotoCategory('EXTERIOR')).toBe(false);
    expect(MANDATORY_PHOTO_CATEGORIES).toEqual(['OVERVIEW', 'ROOF', 'INTERIOR', 'DASHBOARD']);
  });
});
