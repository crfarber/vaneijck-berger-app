import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import {
  AuthorizationStatus as MessagingAuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import type { Logger } from '@/shared/logging/logger';
import { LOCAL_BANNER_KEY } from '../../domain/banner';
import type { RemoteMessage } from '../../domain/types';
import type { PushBanner, PushGateway } from '../../service/push-runtime';
import { setFirebaseBackgroundDelivery } from './firebase-background-delivery';
import { remoteFromFirebaseMessage } from './firebase-message';

const CHANNEL_ID = 'default';

function permissionGranted(
  status: (typeof MessagingAuthorizationStatus)[keyof typeof MessagingAuthorizationStatus],
): boolean {
  return (
    status === MessagingAuthorizationStatus.AUTHORIZED ||
    status === MessagingAuthorizationStatus.PROVISIONAL
  );
}

function notificationData(data: Readonly<Record<string, unknown>> | null): Record<string, string> {
  if (data === null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]),
  );
}

function remoteFromNotifeeNotification(notification: {
  id?: string;
  data?: Record<string, string | number | object>;
  title?: string;
  body?: string;
}): RemoteMessage {
  const raw = notification.data ?? {};
  const data = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]),
  );
  const { [LOCAL_BANNER_KEY]: _localBanner, ...remoteData } = data;
  return {
    messageId: notification.id ?? null,
    data: remoteData,
    notification: { title: notification.title ?? null, body: notification.body ?? null },
  };
}

/** Firebase Cloud Messaging and Notifee on the device. */
export function createFirebasePushGateway(logger?: Logger): PushGateway {
  const firebaseMessaging = getMessaging();

  async function readToken(): Promise<string | null> {
    try {
      if (!isDeviceRegisteredForRemoteMessages(firebaseMessaging)) {
        await registerDeviceForRemoteMessages(firebaseMessaging);
      }
      const value = (await getToken(firebaseMessaging)).trim();
      return value === '' ? null : value;
    } catch (error) {
      logger?.warn('notifications', 'Could not read the push token', { error });
      return null;
    }
  }

  return {
    async ensureReady(channelName) {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: CHANNEL_ID,
          name: channelName,
          importance: AndroidImportance.HIGH,
        });
      }
    },

    /**
     * Read-only. The OS dialog is asked from DevicePermissions (disclosure / settings), so a
     * signed-in start never races a disclosure screen.
     */
    async permission() {
      const current = await hasPermission(firebaseMessaging);
      return permissionGranted(current) ? 'granted' : 'denied';
    },

    token: readToken,

    onToken(listener) {
      return onTokenRefresh(firebaseMessaging, listener);
    },

    listen(listener) {
      const foreground = onMessage(firebaseMessaging, (message) => {
        listener(remoteFromFirebaseMessage(message), 'foreground');
      });
      const opened = onNotificationOpenedApp(firebaseMessaging, (message) => {
        listener(remoteFromFirebaseMessage(message), 'opened');
      });
      const pressed = notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS && detail.notification !== undefined) {
          listener(remoteFromNotifeeNotification(detail.notification), 'opened');
        }
      });
      setFirebaseBackgroundDelivery((message) => listener(message, 'background'));

      void getInitialNotification(firebaseMessaging)
        .then((message) => {
          if (message !== null) {
            listener(remoteFromFirebaseMessage(message), 'initial');
          }
        })
        .catch((error: unknown) => {
          logger?.warn('notifications', 'Could not read the notification that opened the app', {
            error,
          });
        });

      return () => {
        foreground();
        opened();
        pressed();
        setFirebaseBackgroundDelivery(null);
      };
    },

    async showBanner(banner: PushBanner) {
      const data = { ...notificationData(banner.data), [LOCAL_BANNER_KEY]: 'true' };
      await notifee.displayNotification({
        title: banner.title,
        body: banner.body,
        data,
        android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
      });
    },
  };
}
