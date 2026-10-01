import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, router } from 'expo-router';
import { PERMISSION_KIND, PERMISSION_STATUS } from '@/domeinen/settings';
import { useDevicePermissions } from '@/domeinen/settings/ui';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { colors } from '@/shared/ui/theme';
import { formatUnreadBadge, unreadCount } from '../domain/history';
import { useNotificationHistory } from '../hooks/notification-history-context';
import BellIcon from '@/shared/ui/icons/bell';

/**
 * Bell on the allocations toolbar. Without notification permission it is red with a slash icon and
 * asks for permission on tap; with unread messages it shows a badge.
 */
export function NotificationBellButton() {
  const { t } = useTranslation();
  const permissions = useDevicePermissions();
  const notifications = useNotificationHistory((state) => state.notifications);
  const [granted, setGranted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void permissions.read(PERMISSION_KIND.notifications).then((snapshot) => {
        if (!cancelled) {
          setGranted(snapshot.status === PERMISSION_STATUS.granted);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [permissions]),
  );

  const unread = granted ? unreadCount(notifications) : 0;
  const badge = formatUnreadBadge(unread);
  const variant = !granted || unread > 0 ? 'alert' : 'default';

  const onPress = async (): Promise<void> => {
    if (!granted) {
      const next = await permissions.request(PERMISSION_KIND.notifications);
      setGranted(next.status === PERMISSION_STATUS.granted);
      return;
    }
    router.push('/notifications');
  };

  return (
    <ToolbarButton
      accessibilityLabel={t('toolbar.notifications')}
      variant={variant}
      badge={badge}
      onPress={() => void onPress()}
    >
      <BellIcon size={24} color={colors.background} />
    </ToolbarButton>
  );
}
