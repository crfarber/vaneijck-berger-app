import { describe, expect, it } from 'vitest';
import {
  DISCLOSURE_ORDER,
  markDisclosureSeen,
  nextDisclosureStep,
  parseDisclosureSeenList,
} from './permission-disclosure';
import { PERMISSION_KIND, PERMISSION_STATUS, type PermissionSnapshot } from './permission-step';

const undetermined: PermissionSnapshot = {
  status: PERMISSION_STATUS.undetermined,
  canAskAgain: true,
};
const granted: PermissionSnapshot = { status: PERMISSION_STATUS.granted, canAskAgain: false };
const denied: PermissionSnapshot = { status: PERMISSION_STATUS.denied, canAskAgain: false };

const allUndetermined = {
  [PERMISSION_KIND.notifications]: undetermined,
  [PERMISSION_KIND.location]: undetermined,
  [PERMISSION_KIND.camera]: undetermined,
};

describe('DISCLOSURE_ORDER', () => {
  it('asks for notifications before location before camera', () => {
    expect([...DISCLOSURE_ORDER]).toEqual([
      PERMISSION_KIND.notifications,
      PERMISSION_KIND.location,
      PERMISSION_KIND.camera,
    ]);
  });
});

describe('nextDisclosureStep', () => {
  it('starts with notifications when nothing has been seen', () => {
    expect(nextDisclosureStep({ seen: new Set(), snapshots: allUndetermined })).toBe(
      PERMISSION_KIND.notifications,
    );
  });

  it('continues with location after notifications were seen', () => {
    expect(
      nextDisclosureStep({
        seen: new Set([PERMISSION_KIND.notifications]),
        snapshots: allUndetermined,
      }),
    ).toBe(PERMISSION_KIND.location);
  });

  it('continues with camera after notifications and location were seen', () => {
    expect(
      nextDisclosureStep({
        seen: new Set([PERMISSION_KIND.notifications, PERMISSION_KIND.location]),
        snapshots: allUndetermined,
      }),
    ).toBe(PERMISSION_KIND.camera);
  });

  it('is finished when every kind has been seen', () => {
    expect(
      nextDisclosureStep({
        seen: new Set([
          PERMISSION_KIND.notifications,
          PERMISSION_KIND.location,
          PERMISSION_KIND.camera,
        ]),
        snapshots: allUndetermined,
      }),
    ).toBeNull();
  });

  it('skips a kind that is already granted without requiring a seen flag', () => {
    expect(
      nextDisclosureStep({
        seen: new Set(),
        snapshots: {
          ...allUndetermined,
          [PERMISSION_KIND.notifications]: granted,
        },
      }),
    ).toBe(PERMISSION_KIND.location);
  });

  it('is finished when every remaining kind is already granted', () => {
    expect(
      nextDisclosureStep({
        seen: new Set(),
        snapshots: {
          [PERMISSION_KIND.notifications]: granted,
          [PERMISSION_KIND.location]: granted,
          [PERMISSION_KIND.camera]: granted,
        },
      }),
    ).toBeNull();
  });

  it('still shows a kind that was refused so the berger can open system settings later', () => {
    expect(
      nextDisclosureStep({
        seen: new Set(),
        snapshots: {
          ...allUndetermined,
          [PERMISSION_KIND.notifications]: denied,
        },
      }),
    ).toBe(PERMISSION_KIND.notifications);
  });

  it('treats a missing snapshot as not granted', () => {
    expect(nextDisclosureStep({ seen: new Set(), snapshots: {} })).toBe(
      PERMISSION_KIND.notifications,
    );
  });
});

describe('markDisclosureSeen', () => {
  it('adds the kind without mutating the previous set', () => {
    const previous = new Set<typeof PERMISSION_KIND.notifications>([]);
    const next = markDisclosureSeen(previous, PERMISSION_KIND.notifications);
    expect(previous.has(PERMISSION_KIND.notifications)).toBe(false);
    expect(next.has(PERMISSION_KIND.notifications)).toBe(true);
  });

  it('returns the same set when the kind was already seen', () => {
    const previous = new Set([PERMISSION_KIND.location]);
    expect(markDisclosureSeen(previous, PERMISSION_KIND.location)).toBe(previous);
  });
});

describe('parseDisclosureSeenList', () => {
  it('keeps only known permission kinds', () => {
    expect(
      [...parseDisclosureSeenList(['notifications', 'bogus', 'camera', 'location'])].sort(),
    ).toEqual(['camera', 'location', 'notifications']);
  });

  it('returns an empty set for an empty list', () => {
    expect(parseDisclosureSeenList([]).size).toBe(0);
  });
});
