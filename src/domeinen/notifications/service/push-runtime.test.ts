import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '@/shared/logging/logger';
import { createFakeClock, deferred } from '@/test/fakes';
import { createNotificationDeduplicator } from '../domain/dedup';
import type { PushPermissionState } from '../domain/registration';
import type { NotificationSource, RemoteMessage } from '../domain/types';
import type { NotificationHandler } from './notification-handler';
import { createPushRuntime, type PushBanner, type PushGateway } from './push-runtime';

const fallback = { title: 'Bericht', body: 'Je hebt een nieuwe melding' };

function message(overrides: Partial<RemoteMessage> = {}): RemoteMessage {
  return {
    messageId: 'msg-1',
    data: { type: 'NewIncident', allocationId: 'a1' },
    notification: { title: 'Nieuw', body: 'A2' },
    ...overrides,
  };
}

function setup(
  options: {
    permission?: PushPermissionState;
    token?: string | null;
    register?: (token: string) => Promise<void>;
  } = {},
) {
  const banners: PushBanner[] = [];
  let tokenListener: ((token: string) => void) | null = null;
  let messageListener: ((message: RemoteMessage, source: NotificationSource) => void) | null = null;
  const gateway: PushGateway = {
    ensureReady: vi.fn(async () => undefined),
    permission: vi.fn(async () => options.permission ?? 'granted'),
    token: vi.fn(async () => (options.token === undefined ? 'fcm-token-abc' : options.token)),
    onToken(listener) {
      tokenListener = listener;
      return () => {
        tokenListener = null;
      };
    },
    listen(listener) {
      messageListener = listener;
      return () => {
        messageListener = null;
      };
    },
    showBanner: vi.fn(async (banner: PushBanner) => {
      banners.push(banner);
    }),
  };
  const register = vi.fn(options.register ?? (async () => undefined));
  const handler: NotificationHandler = { handle: vi.fn(async () => ({ resolved: true })) };
  const navigation = { openAllocations: vi.fn() };
  const logger = createLogger({ clock: createFakeClock() });
  const runtime = createPushRuntime({
    gateway,
    register,
    handler,
    deduplicator: createNotificationDeduplicator(),
    navigation,
    channelName: () => 'Algemeen',
    bannerFallback: () => fallback,
    logger,
  });

  return {
    runtime,
    gateway,
    register,
    handler,
    navigation,
    banners,
    logger,
    emit(remote: RemoteMessage, source: NotificationSource) {
      messageListener?.(remote, source);
    },
    rotate(token: string) {
      tokenListener?.(token);
    },
  };
}

describe('createPushRuntime', () => {
  it('registers the token when permission is granted', async () => {
    const { runtime, register, gateway } = setup();

    await runtime.start();

    expect(gateway.ensureReady).toHaveBeenCalledWith('Algemeen');
    expect(register).toHaveBeenCalledWith('fcm-token-abc');
  });

  it('keeps working when permission is denied and does not register', async () => {
    const { runtime, register, logger, gateway } = setup({
      permission: 'denied',
      token: 'unused',
    });

    await expect(runtime.start()).resolves.toBeUndefined();

    // The gateway only reports status; the OS dialog is asked from disclosure / settings.
    expect(gateway.permission).toHaveBeenCalledOnce();
    expect(register).not.toHaveBeenCalled();
    expect(logger.entries().map((entry) => entry.message)).toContain(
      'Push permission denied; the app keeps working',
    );
  });

  it('registers on a later start after permission becomes granted', async () => {
    const { runtime, register, gateway } = setup({ permission: 'denied', token: 'fcm-token-abc' });
    await runtime.start();
    expect(register).not.toHaveBeenCalled();

    vi.mocked(gateway.permission).mockResolvedValue('granted');
    await runtime.start();

    expect(register).toHaveBeenCalledWith('fcm-token-abc');
  });

  it('does not register when the device has no token', async () => {
    const { runtime, register } = setup({ token: '  ' });

    await runtime.start();

    expect(register).not.toHaveBeenCalled();
  });

  it('logs a failed registration and still starts listening', async () => {
    const { runtime, register, handler, emit } = setup({
      register: async () => {
        throw new Error('offline');
      },
    });

    await expect(runtime.start()).resolves.toBeUndefined();

    expect(register).toHaveBeenCalledOnce();
    emit(message(), 'foreground');
    await vi.waitFor(() => expect(handler.handle).toHaveBeenCalledOnce());
  });

  it('registers again when the token changes', async () => {
    const { runtime, register, rotate } = setup();
    await runtime.start();

    rotate('fcm-token-next');

    expect(register).toHaveBeenCalledWith('fcm-token-next');
  });

  it('shows a foreground banner and refreshes, without opening the overview', async () => {
    const { runtime, handler, navigation, banners, emit } = setup();
    await runtime.start();

    emit(message(), 'foreground');

    await vi.waitFor(() => expect(handler.handle).toHaveBeenCalledOnce());
    expect(banners).toEqual([{ title: 'Nieuw', body: 'A2', data: message().data }]);
    expect(navigation.openAllocations).not.toHaveBeenCalled();
  });

  it('uses the fallback text when the message has no title or body', async () => {
    const { runtime, banners, emit } = setup();
    await runtime.start();

    emit(message({ notification: { title: '', body: null } }), 'foreground');

    await vi.waitFor(() =>
      expect(banners).toEqual([
        { title: fallback.title, body: fallback.body, data: message().data },
      ]),
    );
  });

  it('handles a background message and a cold start, and ignores the repeat', async () => {
    const { runtime, handler, navigation, banners, emit } = setup();
    await runtime.start();

    emit(message(), 'background');
    emit(message(), 'initial');
    emit(message(), 'background');

    await vi.waitFor(() => expect(handler.handle).toHaveBeenCalledTimes(2));
    expect(banners).toEqual([]);
    expect(navigation.openAllocations).toHaveBeenCalledOnce();
  });

  it('still opens the overview when the tapped message was already handled', async () => {
    const { runtime, handler, navigation, emit } = setup();
    await runtime.start();

    emit(message(), 'background');
    emit(message(), 'opened');

    await vi.waitFor(() => expect(navigation.openAllocations).toHaveBeenCalledOnce());
    expect(handler.handle).toHaveBeenCalledTimes(2);
  });

  it('handles standby location advice and navigates on a cold-start tap', async () => {
    const { runtime, handler, banners, navigation, emit } = setup();
    await runtime.start();

    emit(
      message({
        data: {
          type: 'StandbyLocationAdvice',
          latitude: '52.34',
          longitude: '4.95',
        },
      }),
      'initial',
    );

    await vi.waitFor(() => expect(handler.handle).toHaveBeenCalledOnce());
    expect(banners).toEqual([]);
    expect(navigation.openAllocations).toHaveBeenCalledOnce();
  });

  it('injects a message through the same path as a real push (debug)', async () => {
    const { runtime, handler, banners } = setup();
    await runtime.start();

    await runtime.inject(
      message({
        data: {
          type: 'StandbyLocationAdvice',
          latitude: '52.34151',
          longitude: '4.95544',
        },
        notification: { title: 'Standby', body: 'Test' },
      }),
      'foreground',
    );

    expect(handler.handle).toHaveBeenCalledOnce();
    expect(banners).toHaveLength(1);
  });

  it('does not log the payload (the old app logged the raw message, including personal data)', async () => {
    const { runtime, logger, handler, emit } = setup({ token: 'fcm-token-super-secret' });
    await runtime.start();
    emit(
      message({
        data: { type: 'NewIncident', allocationId: 'a1', phone: '+31600000000' },
        notification: { title: 'Kenteken AB-12-CD', body: 'secret-body-99' },
      }),
      'foreground',
    );
    await vi.waitFor(() => expect(handler.handle).toHaveBeenCalledOnce());

    const log = JSON.stringify(logger.entries());
    expect(log).not.toContain('super-secret');
    expect(log).not.toContain('secret-body-99');
    expect(log).not.toContain('+31600000000');
    expect(log).not.toContain('AB-12-CD');
  });

  it('drops a start that loses the race with stop', async () => {
    const permission = deferred<PushPermissionState>();
    const { runtime, gateway, handler, emit } = setup();
    gateway.permission = () => permission.promise;
    const starting = runtime.start();

    runtime.stop();
    permission.resolve('granted');
    await starting;
    emit(message(), 'foreground');

    await Promise.resolve();
    expect(handler.handle).not.toHaveBeenCalled();
  });
});
