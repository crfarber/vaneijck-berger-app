import { describe, expect, it } from 'vitest';
import { localsForOverview, pickMandatoryAndExtra } from './overview-assignment';
import { PHOTO_STATUS } from './types';

const front = { category: 'EXTERIOR', angle: 'voor' } as const;
const rear = { category: 'EXTERIOR', angle: 'achter' } as const;

const local = (
  id: string,
  position: typeof front | typeof rear,
  status: (typeof PHOTO_STATUS)[keyof typeof PHOTO_STATUS],
  options: { overrideExisting?: boolean; takenAt?: number } = {},
) => ({
  id,
  position,
  status,
  overrideExisting: options.overrideExisting,
  takenAt: options.takenAt ?? 0,
});

describe('localsForOverview', () => {
  it('keeps only the latest override per type and drops earlier sent siblings', () => {
    expect(
      localsForOverview([
        local('orig-front', front, PHOTO_STATUS.sent, { takenAt: 1 }),
        local('orig-rear', rear, PHOTO_STATUS.sent, { takenAt: 1 }),
        local('ovr-front', front, PHOTO_STATUS.draft, {
          overrideExisting: true,
          takenAt: 2,
        }),
        local('ovr-rear', rear, PHOTO_STATUS.draft, {
          overrideExisting: true,
          takenAt: 3,
        }),
      ]).map((photo) => photo.id),
    ).toEqual(['ovr-front', 'ovr-rear']);
  });

  it('when two overrides exist for the same type, keeps only the newest', () => {
    expect(
      localsForOverview([
        local('first', front, PHOTO_STATUS.sent, { overrideExisting: true, takenAt: 1 }),
        local('second', front, PHOTO_STATUS.draft, { overrideExisting: true, takenAt: 2 }),
      ]).map((photo) => photo.id),
    ).toEqual(['second']);
  });
});

describe('pickMandatoryAndExtra', () => {
  it('puts two overrides on mandatory tiles even when earlier sent siblings are still present', () => {
    const { mandatory, extra } = pickMandatoryAndExtra(
      [front, rear],
      [
        local('orig-front', front, PHOTO_STATUS.sent, { takenAt: 1 }),
        local('orig-rear', rear, PHOTO_STATUS.sent, { takenAt: 1 }),
        local('ovr-front', front, PHOTO_STATUS.draft, {
          overrideExisting: true,
          takenAt: 2,
        }),
        local('ovr-rear', rear, PHOTO_STATUS.draft, {
          overrideExisting: true,
          takenAt: 3,
        }),
      ],
    );
    expect(mandatory.map((photo) => photo?.id)).toEqual(['ovr-front', 'ovr-rear']);
    expect(extra.map((photo) => photo.id)).toEqual(['orig-front', 'orig-rear']);
  });
});
