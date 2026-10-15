import { describe, expect, it } from 'vitest';
import { matchLocalCopies } from './local-copies';
import { PHOTO_STATUS, type PhotoPosition, type PhotoStatus } from './types';

const front: PhotoPosition = { category: 'EXTERIOR', angle: 'voor' };
const rear: PhotoPosition = { category: 'EXTERIOR', angle: 'achter' };
const dashboard: PhotoPosition = { category: 'DASHBOARD' };

const local = (id: string, position: PhotoPosition, status: PhotoStatus = PHOTO_STATUS.sent) => ({
  id,
  position,
  status,
});

describe('matchLocalCopies', () => {
  it('uses the local copy of a sent photo of the same type', () => {
    const copy = local('a', front);
    expect(matchLocalCopies([{ position: front }], [copy])).toEqual([copy]);
  });

  it('leaves server photos without a local copy unmatched', () => {
    expect(matchLocalCopies([{ position: rear }], [local('a', front)])).toEqual([null]);
  });

  it('gives each local copy to only one server photo', () => {
    const first = local('a', front);
    const second = local('b', front);
    expect(
      matchLocalCopies(
        [{ position: front }, { position: front }, { position: front }],
        [first, second],
      ),
    ).toEqual([first, second, null]);
  });

  it('never shows a photo that was not sent as the server copy', () => {
    expect(
      matchLocalCopies(
        [{ position: dashboard }],
        [
          local('draft', dashboard, PHOTO_STATUS.draft),
          local('queued', dashboard, PHOTO_STATUS.queued),
          local('failed', dashboard, PHOTO_STATUS.failed),
        ],
      ),
    ).toEqual([null]);
  });

  it('matches photos of different types independently of their order', () => {
    const frontCopy = local('a', front);
    const dashboardCopy = local('b', dashboard);
    expect(
      matchLocalCopies(
        [{ position: dashboard }, { position: rear }, { position: front }],
        [frontCopy, dashboardCopy],
      ),
    ).toEqual([dashboardCopy, null, frontCopy]);
  });

  it('returns nothing when the server has no photos', () => {
    expect(matchLocalCopies([], [local('a', front)])).toEqual([]);
  });
});
