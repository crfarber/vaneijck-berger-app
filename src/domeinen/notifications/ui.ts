/** The React Native side of notifications. Only routes and bootstrap import this file. */
export { createFirebasePushGateway } from './platform/rn/firebase-push-gateway';
export {
  NotificationHistoryProvider,
  useNotificationHistory,
  useNotificationHistoryApi,
} from './hooks/notification-history-context';
export { NotificationBellButton } from './components/notification-bell-button';
export { NotificationsScreen } from './screens/notifications-screen';
