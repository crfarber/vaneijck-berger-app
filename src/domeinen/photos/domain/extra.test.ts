import { describe, expect, it } from 'vitest';
import { isExtraForUpload } from './extra';
import { PHOTO_PHASE, PHOTO_STATUS, type Photo, type PhotoPosition } from './types';

const dashboard: PhotoPosition = { category: 'DASHBOARD' };
const leftFront: PhotoPosition = { category: 'EXTERIOR', angle: 'links-voor' };

function photo(overrides: Partial<Photo> & Pick<Photo, 'id' | 'takenAt'>): Photo {
  return {
    serviceId: 'svc-1',
    incidentId: 'inc-1',
    allocationId: 'alloc-1',
    phase: PHOTO_PHASE.load,
    role: 'mandatory',
    position: dashboard,
    filePath: `/tmp/${overrides.id}.jpg`,
    coordinate: { latitude: 52, longitude: 5 },
    status: PHOTO_STATUS.queued,
    ...overrides,
  };
}

describe('isExtraForUpload', () => {
  it('marks the first of a type in a phase as not extra', () => {
    const first = photo({ id: 'a', takenAt: 1 });
    expect(isExtraForUpload(first, [first])).toBe(false);
  });

  it('marks the second and later of the same type as extra', () => {
    const first = photo({ id: 'a', takenAt: 1 });
    const second = photo({ id: 'b', takenAt: 2 });
    const third = photo({ id: 'c', takenAt: 3 });
    expect(isExtraForUpload(second, [first, second, third])).toBe(true);
    expect(isExtraForUpload(third, [first, second, third])).toBe(true);
  });

  it('treats different types independently', () => {
    const dash = photo({ id: 'a', takenAt: 1, position: dashboard });
    const exterior = photo({ id: 'b', takenAt: 2, position: leftFront });
    expect(isExtraForUpload(exterior, [dash, exterior])).toBe(false);
  });

  it('does not let a load photo make a delivery photo extra', () => {
    const load = photo({ id: 'a', takenAt: 1, phase: PHOTO_PHASE.load });
    const delivery = photo({ id: 'b', takenAt: 2, phase: PHOTO_PHASE.delivery });
    expect(isExtraForUpload(delivery, [load, delivery])).toBe(false);
  });

  it('keeps the first/extra pattern for delivery retakes of the same ordinal', () => {
    const load1 = photo({ id: 'l1', takenAt: 1, phase: PHOTO_PHASE.load });
    const load2 = photo({ id: 'l2', takenAt: 2, phase: PHOTO_PHASE.load });
    const load3 = photo({ id: 'l3', takenAt: 3, phase: PHOTO_PHASE.load });
    const delivery1 = photo({ id: 'd1', takenAt: 10, phase: PHOTO_PHASE.delivery });
    const delivery2 = photo({ id: 'd2', takenAt: 11, phase: PHOTO_PHASE.delivery });
    const delivery3 = photo({ id: 'd3', takenAt: 12, phase: PHOTO_PHASE.delivery });
    const all = [load1, load2, load3, delivery1, delivery2, delivery3];

    expect(isExtraForUpload(delivery1, all)).toBe(false);
    expect(isExtraForUpload(delivery2, all)).toBe(true);
    expect(isExtraForUpload(delivery3, all)).toBe(true);
  });

  it('counts already-sent photos in the same phase so a later upload stays extra', () => {
    const sent = photo({
      id: 'a',
      takenAt: 1,
      status: PHOTO_STATUS.sent,
    });
    const again = photo({ id: 'b', takenAt: 2 });
    expect(isExtraForUpload(again, [sent, again])).toBe(true);
  });

  it('breaks ties on takenAt with id', () => {
    const a = photo({ id: 'a', takenAt: 5 });
    const b = photo({ id: 'b', takenAt: 5 });
    expect(isExtraForUpload(a, [b, a])).toBe(false);
    expect(isExtraForUpload(b, [b, a])).toBe(true);
  });

  it('treats a photo missing from the list as extra when siblings already exist', () => {
    const existing = photo({ id: 'a', takenAt: 1 });
    const orphan = photo({ id: 'orphan', takenAt: 2 });
    expect(isExtraForUpload(orphan, [existing])).toBe(true);
  });
});
