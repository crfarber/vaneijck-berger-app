import { describe, expect, it } from 'vitest';
import { localsForOverview, pickMandatoryAndExtra } from './overview-assignment';
import { PHOTO_ROLE, PHOTO_STATUS } from './types';

const front = { category: 'EXTERIOR', angle: 'voor' } as const;
const rear = { category: 'EXTERIOR', angle: 'achter' } as const;
const roof = { category: 'ROOF' } as const;

const local = (
  id: string,
  position: typeof front | typeof rear | typeof roof,
  status: (typeof PHOTO_STATUS)[keyof typeof PHOTO_STATUS],
  options: {
    overrideExisting?: boolean;
    takenAt?: number;
    role?: (typeof PHOTO_ROLE)[keyof typeof PHOTO_ROLE];
    source?: 'local' | 'server';
    isExtra?: boolean;
  } = {},
) => ({
  id,
  position,
  status,
  overrideExisting: options.overrideExisting,
  takenAt: options.takenAt ?? 0,
  role: options.role,
  source: options.source,
  isExtra: options.isExtra,
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

  it('keeps an additional photo of an overridden type under Extra', () => {
    expect(
      localsForOverview([
        local('orig', front, PHOTO_STATUS.sent, {
          role: PHOTO_ROLE.mandatory,
          takenAt: 1,
        }),
        local('extra', front, PHOTO_STATUS.sent, {
          role: PHOTO_ROLE.additional,
          takenAt: 2,
        }),
        local('ovr', front, PHOTO_STATUS.draft, {
          overrideExisting: true,
          role: PHOTO_ROLE.mandatory,
          takenAt: 3,
        }),
      ]).map((photo) => photo.id),
    ).toEqual(['extra', 'ovr']);
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

  it('never fills a mandatory tile with a local additional photo', () => {
    const { mandatory, extra } = pickMandatoryAndExtra(
      [roof],
      [
        local('extra-roof', roof, PHOTO_STATUS.sent, {
          role: PHOTO_ROLE.additional,
          source: 'local',
          isExtra: true,
        }),
        local('mandatory-roof', roof, PHOTO_STATUS.sent, {
          role: PHOTO_ROLE.mandatory,
          source: 'local',
        }),
      ],
    );
    expect(mandatory.map((photo) => photo?.id)).toEqual(['mandatory-roof']);
    expect(extra.map((photo) => photo.id)).toEqual(['extra-roof']);
  });

  it('prefers a server non-extra over a server extra for the mandatory tile', () => {
    const { mandatory, extra } = pickMandatoryAndExtra(
      [roof],
      [
        local('server-extra', roof, PHOTO_STATUS.sent, {
          source: 'server',
          isExtra: true,
        }),
        local('server-primary', roof, PHOTO_STATUS.sent, {
          source: 'server',
          isExtra: false,
        }),
      ],
    );
    expect(mandatory.map((photo) => photo?.id)).toEqual(['server-primary']);
    expect(extra.map((photo) => photo.id)).toEqual(['server-extra']);
  });

  it('falls back to a server extra when no non-extra is available', () => {
    const { mandatory, extra } = pickMandatoryAndExtra(
      [roof],
      [
        local('server-extra', roof, PHOTO_STATUS.sent, {
          source: 'server',
          isExtra: true,
        }),
      ],
    );
    expect(mandatory.map((photo) => photo?.id)).toEqual(['server-extra']);
    expect(extra).toEqual([]);
  });
});
