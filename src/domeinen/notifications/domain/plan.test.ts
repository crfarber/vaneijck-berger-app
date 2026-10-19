import { describe, expect, it } from 'vitest';
import {
  getDisplayMode,
  isDisabled,
  isTapSource,
  planEffects,
  shouldNavigateOnTap,
  shouldShowForegroundBanner,
} from './plan';
import { NOTIFICATION_TOKENS, type NotificationToken, type ParsedNotification } from './types';

const standbyAdvice = {
  standbyLocationId: 'loc-1',
  latitude: 52.34,
  longitude: 4.95,
};

const notification = (
  token: NotificationToken | null,
  ids: Partial<ParsedNotification> = {},
): ParsedNotification => ({
  id: null,
  token,
  hasExplicitType: token !== null,
  title: '',
  body: '',
  ...ids,
});

describe('planEffects', () => {
  it('looks at everything when the type is unknown or missing and expires standby', () => {
    expect(planEffects(notification(null))).toEqual([
      { type: 'refresh-allocations' },
      { type: 'expire-standby-advice' },
    ]);
  });

  it.each(['NewIncident', 'ChangedIncident', 'AcceptService', 'NewTms'] as const)(
    'fetches the allocation for %s and expires standby',
    (token) => {
      expect(planEffects(notification(token, { allocationId: 'a1' }))).toEqual([
        { type: 'fetch-allocation', allocationId: 'a1' },
        { type: 'expire-standby-advice' },
      ]);
    },
  );

  it.each(['NewIncident', 'ChangedIncident', 'AcceptService', 'NewTms'] as const)(
    'refreshes everything for %s without an allocation id and expires standby',
    (token) => {
      expect(planEffects(notification(token))).toEqual([
        { type: 'refresh-allocations' },
        { type: 'expire-standby-advice' },
      ]);
    },
  );

  it.each(['DissolvedIncident', 'AllocationDissolved'] as const)(
    'removes the allocation for %s without expiring standby',
    (token) => {
      expect(planEffects(notification(token, { allocationId: 'a1', incidentId: 'i1' }))).toEqual([
        { type: 'remove-allocation', allocationId: 'a1', incidentId: 'i1' },
      ]);
    },
  );

  it('removes by incident id when there is no allocation id', () => {
    expect(planEffects(notification('AllocationDissolved', { incidentId: 'i1' }))).toEqual([
      { type: 'remove-allocation', allocationId: undefined, incidentId: 'i1' },
    ]);
  });

  it('refreshes everything for a dissolved message without any id', () => {
    expect(planEffects(notification('DissolvedIncident'))).toEqual([
      { type: 'refresh-allocations' },
    ]);
  });

  it('reloads the worker for a status message', () => {
    expect(planEffects(notification('WorkerStatus'))).toEqual([{ type: 'reload-worker' }]);
  });

  it('reloads the vehicle releases, and the allocation when there is one, and expires standby', () => {
    expect(planEffects(notification('VehicleDeliverance'))).toEqual([
      { type: 'reload-vehicle-releases' },
      { type: 'expire-standby-advice' },
    ]);
    expect(planEffects(notification('VehicleDeliverance', { allocationId: 'a1' }))).toEqual([
      { type: 'reload-vehicle-releases' },
      { type: 'fetch-allocation', allocationId: 'a1' },
      { type: 'expire-standby-advice' },
    ]);
  });

  it('applies standby advice when coordinates are present', () => {
    expect(planEffects(notification('StandbyLocationAdvice', { standbyAdvice }))).toEqual([
      { type: 'apply-standby-advice', advice: standbyAdvice },
    ]);
  });

  it('does nothing for standby advice without coordinates', () => {
    expect(planEffects(notification('StandbyLocationAdvice'))).toEqual([]);
  });

  it('plans something for every known token, so none is forgotten', () => {
    for (const token of NOTIFICATION_TOKENS) {
      const effects = planEffects(
        notification(token, {
          allocationId: 'a1',
          incidentId: 'i1',
          standbyAdvice,
        }),
      );
      expect(Array.isArray(effects)).toBe(true);
      if (getDisplayMode(token) !== 'disabled') {
        expect(effects.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('display modes', () => {
  it('shows and navigates for normal messages', () => {
    const mode = getDisplayMode('NewIncident');
    expect(mode).toBe('default');
    expect(shouldShowForegroundBanner(mode)).toBe(true);
    expect(shouldNavigateOnTap(mode)).toBe(true);
    expect(isDisabled(mode)).toBe(false);
  });

  it('handles worker status silently', () => {
    const mode = getDisplayMode('WorkerStatus');
    expect(mode).toBe('hiddenBanner');
    expect(shouldShowForegroundBanner(mode)).toBe(false);
    expect(shouldNavigateOnTap(mode)).toBe(false);
    expect(isDisabled(mode)).toBe(false);
  });

  it('treats standby location advice as a normal message', () => {
    const mode = getDisplayMode('StandbyLocationAdvice');
    expect(mode).toBe('default');
    expect(isDisabled(mode)).toBe(false);
    expect(shouldShowForegroundBanner(mode)).toBe(true);
    expect(shouldNavigateOnTap(mode)).toBe(true);
  });

  it('treats an unknown message as a normal one', () => {
    expect(getDisplayMode(null)).toBe('default');
  });
});

describe('isTapSource', () => {
  it.each(['opened', 'initial', 'notifee-press'] as const)('%s is a tap', (source) => {
    expect(isTapSource(source)).toBe(true);
  });

  it.each([['foreground'], ['background'], [undefined]] as const)('%s is not a tap', (source) => {
    expect(isTapSource(source)).toBe(false);
  });
});
