import type { Logger } from '@/shared/logging/logger';
import { bannerText } from '../domain/banner';
import { decideIncoming } from '../domain/incoming';
import { parseNotification } from '../domain/parse';
import { getDisplayMode, isDisabled } from '../domain/plan';
import { planRegistration, type PushPermissionState } from '../domain/registration';
import { notificationDedupKeys, type NotificationDeduplicator } from '../domain/dedup';
import type { NotificationSource, ParsedNotification, RemoteMessage } from '../domain/types';
import type { NotificationHandler } from './notification-handler';

/** In-app history the bell and notifications screen read. Optional so existing tests stay light. */
export type NotificationHistorySink = {
  add(notification: ParsedNotification): void;
};

export type PushBanner = {
  title: string;
  body: string;
  /** Passed through so a tap on the banner still carries the allocation id. */
  data: Readonly<Record<string, unknown>> | null;
};

/**
 * The device. Implemented with Firebase Messaging. Never throws for a denied permission or a
 * missing token: those are ordinary outcomes.
 */
export type PushGateway = {
  /** Creates the Android channel and prepares native delivery. Safe to call more than once. */
  ensureReady(channelName: string): Promise<void>;
  permission(): Promise<PushPermissionState>;
  token(): Promise<string | null>;
  onToken(listener: (token: string) => void): () => void;
  listen(listener: (message: RemoteMessage, source: NotificationSource) => void): () => void;
  showBanner(banner: PushBanner): Promise<void>;
};

export type PushNavigation = {
  /** The allocations overview. The old app did not open one specific allocation. */
  openAllocations(): void;
};

export type PushRuntime = {
  /**
   * Reads permission (does not ask), registers the token when allowed, and starts listening.
   * Safe to call again — e.g. after the disclosure screen grants notifications.
   */
  start(): Promise<void>;
  stop(): void;
  /**
   * Simulates an incoming FCM message (debug screen). Uses the same parse → history → effects
   * path as a real push.
   */
  inject(message: RemoteMessage, source?: NotificationSource): Promise<void>;
};

export type PushRuntimeDeps = {
  gateway: PushGateway;
  register: (token: string) => Promise<void>;
  handler: NotificationHandler;
  deduplicator: NotificationDeduplicator;
  navigation: PushNavigation;
  /** Read when needed, so a language switch in the settings is followed. */
  channelName: () => string;
  bannerFallback: () => { title: string; body: string };
  /** Every non-disabled message is recorded for the in-app history (bell). */
  history?: NotificationHistorySink;
  logger?: Logger;
};

export function createPushRuntime(deps: PushRuntimeDeps): PushRuntime {
  const { gateway, handler, deduplicator, navigation, logger } = deps;
  let generation = 0;
  let unsubscribe: (() => void) | null = null;

  function detach(): void {
    unsubscribe?.();
    unsubscribe = null;
  }

  async function registerToken(token: string): Promise<void> {
    try {
      await deps.register(token);
      logger?.info('notifications', 'Registered the device for push');
    } catch (error) {
      // A failed registration must not block the app. The next start, or a new token, tries again.
      logger?.warn('notifications', 'Could not register the device for push', { error });
    }
  }

  async function receive(message: RemoteMessage, source: NotificationSource): Promise<void> {
    const notification = parseNotification(message);
    if (!isDisabled(getDisplayMode(notification.token))) {
      deps.history?.add(notification);
    }
    const keys = notificationDedupKeys(notification);
    const duplicate = keys.length > 0 && !deduplicator.shouldProcess(keys);
    const decision = decideIncoming({ notification, source, duplicate });
    if (!decision.process && !decision.showBanner && !decision.navigate) {
      return;
    }

    if (decision.showBanner) {
      const text = bannerText(notification, deps.bannerFallback());
      try {
        await gateway.showBanner({
          title: text.title,
          body: text.body,
          data: message.data ?? null,
        });
      } catch (error) {
        logger?.warn('notifications', 'Could not show the notification banner', { error });
      }
    }

    if (decision.process) {
      await handler.handle(notification);
    }
    if (decision.navigate) {
      navigation.openAllocations();
    }
  }

  return {
    async start() {
      const current = ++generation;
      detach();
      try {
        await gateway.ensureReady(deps.channelName());
        if (current !== generation) {
          return;
        }
        const permission = await gateway.permission();
        if (current !== generation) {
          return;
        }
        const token = permission === 'granted' ? await gateway.token() : null;
        if (current !== generation) {
          return;
        }
        const plan = planRegistration({ permission, token });
        if (plan.action === 'skip') {
          logger?.info(
            'notifications',
            plan.reason === 'denied'
              ? 'Push permission denied; the app keeps working'
              : 'No push token available',
          );
        } else {
          await registerToken(plan.token);
          if (current !== generation) {
            return;
          }
        }

        const stopMessages = gateway.listen((message, source) => {
          void receive(message, source);
        });
        const stopToken = gateway.onToken((next) => {
          const nextPlan = planRegistration({ permission: 'granted', token: next });
          if (nextPlan.action === 'register') {
            void registerToken(nextPlan.token);
          }
        });
        if (current !== generation) {
          stopMessages();
          stopToken();
          return;
        }
        unsubscribe = () => {
          stopMessages();
          stopToken();
        };
      } catch (error) {
        logger?.error('notifications', 'Could not start push notifications', { error });
      }
    },

    stop() {
      generation += 1;
      detach();
    },

    inject(message, source = 'foreground') {
      return receive(message, source);
    },
  };
}
