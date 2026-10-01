import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import type { RemoteMessage } from '../../domain/types';

export function remoteFromFirebaseMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
): RemoteMessage {
  return {
    messageId: message.messageId ?? null,
    data: message.data,
    notification:
      message.notification === undefined
        ? null
        : {
            title: message.notification.title ?? null,
            body: message.notification.body ?? null,
          },
  };
}
