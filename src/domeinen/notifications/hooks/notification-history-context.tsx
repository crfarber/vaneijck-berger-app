import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type {
  NotificationHistory,
  NotificationHistoryState,
} from '../service/notification-history';

const NotificationHistoryContext = createContext<NotificationHistory | null>(null);

export function NotificationHistoryProvider({
  value,
  children,
}: {
  value: NotificationHistory;
  children: ReactNode;
}) {
  return (
    <NotificationHistoryContext.Provider value={value}>
      {children}
    </NotificationHistoryContext.Provider>
  );
}

export function useNotificationHistoryApi(): NotificationHistory {
  const value = useContext(NotificationHistoryContext);
  if (value === null) {
    throw new Error('NotificationHistoryProvider is missing');
  }
  return value;
}

/**
 * Selects a slice of the history store. Re-renders when the selected value changes (by
 * `Object.is`), same idea as a Zustand React binding.
 */
export function useNotificationHistory<T>(selector: (state: NotificationHistoryState) => T): T {
  const history = useNotificationHistoryApi();
  return useSyncExternalStore(
    (onStoreChange) => history.subscribe(() => onStoreChange()),
    () => selector(history.getState()),
    () => selector(history.getState()),
  );
}
