import { describe, expect, it } from 'vitest';
import {
  deliveryPhotoRequirements,
  EXTRA_PHOTO_CATEGORIES,
  missingPhotoPositions,
  photoPositionForRequirement,
  reconcileHistoryPositions,
  requiresPhotoPositionDetail,
  unmatchedLoadPhotos,
} from './photo-position-options';

describe('extra photo position options', () => {
  it('offers every supported category for an extra photo', () => {
    expect(EXTRA_PHOTO_CATEGORIES).toEqual([
      'OVERVIEW',
      'EXTERIOR',
      'ROOF',
      'INTERIOR',
      'DASHBOARD',
      'ENGINE',
      'TYRES',
      'TRAILER',
      'CARGO',
    ]);
  });

  it('requires a detail only for exterior and tyre photos', () => {
    expect(requiresPhotoPositionDetail('EXTERIOR')).toBe(true);
    expect(requiresPhotoPositionDetail('TYRES')).toBe(true);
    expect(requiresPhotoPositionDetail('DASHBOARD')).toBe(false);
  });
});

describe('service definition photo requirements', () => {
  it('maps defined angles and simple categories to actual photo positions', () => {
    expect(photoPositionForRequirement('links-voor')).toEqual({
      category: 'EXTERIOR',
      angle: 'links-voor',
    });
    expect(photoPositionForRequirement('Dak')).toEqual({ category: 'ROOF' });
    expect(photoPositionForRequirement('banden:rechts-achter')).toEqual({
      category: 'TYRES',
      tyre: 'rechts-achter',
    });
    expect(photoPositionForRequirement('unknown')).toBeNull();
  });

  it('requires a separate delivery photo for every extra load photo, including duplicates', () => {
    const front = { category: 'EXTERIOR', angle: 'links-voor' } as const;
    const roof = { category: 'ROOF' } as const;
    expect(unmatchedLoadPhotos([front, front, front, roof], [front])).toEqual([front, front, roof]);
    expect(missingPhotoPositions([front, front, roof], [front, roof])).toEqual([front]);
  });

  it('combines current requirements with every unmatched load photo occurrence', () => {
    const front = { category: 'EXTERIOR', angle: 'links-voor' } as const;
    const roof = { category: 'ROOF' } as const;
    const dashboard = { category: 'DASHBOARD' } as const;

    expect(deliveryPhotoRequirements([front, dashboard], [front, roof, roof])).toEqual([
      front,
      dashboard,
      roof,
      roof,
    ]);
  });

  it('uses complete server history without duplicating sent local photos', () => {
    const roof = { category: 'ROOF' } as const;
    const dashboard = { category: 'DASHBOARD' } as const;
    const interior = { category: 'INTERIOR' } as const;

    expect(
      reconcileHistoryPositions(
        [
          { position: roof, status: 'sent' },
          { position: interior, status: 'draft' },
        ],
        [roof, dashboard],
        true,
      ),
    ).toEqual([roof, dashboard, interior]);
  });
});
