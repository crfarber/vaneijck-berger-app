import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { deliverFirebaseBackgroundMessage } from './firebase-background-delivery';
import { remoteFromFirebaseMessage } from './firebase-message';

setBackgroundMessageHandler(getMessaging(), async (message) => {
  deliverFirebaseBackgroundMessage(remoteFromFirebaseMessage(message));
});
