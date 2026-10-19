import { describe, expect, it } from 'vitest';
import { decideIncoming } from './incoming';
import type { NotificationSource, NotificationToken, ParsedNotification } from './types';

const notification = (
  token: NotificationToken | null,
  overrides: Partial<ParsedNotification> = {},
): ParsedNotification => ({
  id: 'msg-1',
  token,
  hasExplicitType: token !== null,
  title: 'Nieuw',
  body: 'A2',
  ...overrides,
});

const decide = (
  source: NotificationSource,
  overrides: Partial<Parameters<typeof decideIncoming>[0]> = {},
) =>
  decideIncoming({
    notification: notification('NewIncident'),
    source,
    duplicate: false,
    ...overrides,
  });

describe('decideIncoming', () => {
  it('shows a banner in the foreground and does not navigate', () => {
    expect(decide('foreground')).toEqual({
      process: true,
      showBanner: true,
      navigate: false,
    });
  });

  it('processes a background message without a banner or navigation', () => {
    expect(decide('background')).toEqual({
      process: true,
      showBanner: false,
      navigate: false,
    });
  });

  it.each(['opened', 'initial', 'notifee-press'] as const)(
    'opens the overview when the message is a tap (%s)',
    (source) => {
      expect(decide(source)).toEqual({
        process: true,
        showBanner: false,
        navigate: true,
      });
    },
  );

  it('ignores a repeat, and still opens the overview when that repeat is a tap', () => {
    expect(decide('background', { duplicate: true })).toEqual({
      process: false,
      showBanner: false,
      navigate: false,
    });
    expect(decide('initial', { duplicate: true })).toEqual({
      process: true,
      showBanner: false,
      navigate: true,
    });
  });

  it('processes standby location advice like a normal message', () => {
    expect(decide('initial', { notification: notification('StandbyLocationAdvice') })).toEqual({
      process: true,
      showBanner: false,
      navigate: true,
    });
    expect(decide('foreground', { notification: notification('StandbyLocationAdvice') })).toEqual({
      process: true,
      showBanner: true,
      navigate: false,
    });
  });

  it('handles a worker-status message without a banner or navigation', () => {
    expect(decide('foreground', { notification: notification('WorkerStatus') })).toEqual({
      process: true,
      showBanner: false,
      navigate: false,
    });
  });
});
