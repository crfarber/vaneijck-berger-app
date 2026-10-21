import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { systemClock } from '@/shared/platform/ports';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { Toolbar, ToolbarSlot } from '@/shared/ui/toolbar';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { formatInstantTime } from '@/shared/utils/time';
import {
  filterByTab,
  groupByDay,
  isIncidentNotificationType,
  NOTIFICATION_FILTER_TAB,
  type NotificationFilterTab,
  type StoredNotification,
  unreadCount,
} from '../domain/history';
import {
  useNotificationHistory,
  useNotificationHistoryApi,
} from '../hooks/notification-history-context';

const TABS = [
  NOTIFICATION_FILTER_TAB.all,
  NOTIFICATION_FILTER_TAB.incidents,
  NOTIFICATION_FILTER_TAB.transport,
  NOTIFICATION_FILTER_TAB.status,
] as const;

function MarkAllReadHeaderButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('notifications.markAllRead')}
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
      hitSlop={spacing.sm}
    >
      <Text style={styles.headerButtonLabel}>{t('notifications.markAllRead')}</Text>
    </Pressable>
  );
}

/**
 * In-app list of received push messages. Incident types open the allocation; others only mark read.
 */
export function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const history = useNotificationHistoryApi();
  const notifications = useNotificationHistory((state) => state.notifications);
  const [tab, setTab] = useState<NotificationFilterTab>(NOTIFICATION_FILTER_TAB.all);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const navigation = useNavigation();
  const hasUnread = unreadCount(notifications) > 0;

  useEffect(() => {
    navigation.setOptions({
      headerRight: hasUnread
        ? () => <MarkAllReadHeaderButton onPress={() => history.markAllRead()} />
        : () => null,
    });
  }, [hasUnread, history, navigation]);

  const sections = useMemo(() => {
    const filtered = filterByTab(notifications, tab);
    return groupByDay(filtered, systemClock.now()).map((group) => ({
      key: group.key,
      title: t(`notifications.sections.${group.key}`),
      data: [...group.data],
    }));
  }, [notifications, tab, t]);

  const onPressRow = (notification: StoredNotification): void => {
    history.markRead(notification.id);
    if (!isIncidentNotificationType(notification.type)) {
      return;
    }
    const allocationId = notification.allocationId?.trim();
    if (allocationId === undefined || allocationId === '') {
      Alert.alert('', t('notifications.allocationNotFound'));
      return;
    }
    router.push(`/allocations/${allocationId}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Toolbar>
          {TABS.map((candidate) => (
            <ToolbarSlot key={candidate}>
              <ToolbarButton
                accessibilityLabel={t(`notifications.tabs.${candidate}`)}
                selected={tab === candidate}
                onPress={() => setTab(candidate)}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[styles.tabLabel, tab === candidate && styles.tabLabelActive]}
                >
                  {t(`notifications.tabs.${candidate}`)}
                </Text>
              </ToolbarButton>
            </ToolbarSlot>
          ))}
        </Toolbar>
      </View>
      <SectionList
        sections={sections}
        style={styles.listViewport}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onPressRow(item)}
            style={({ pressed }) => [
              styles.row,
              !item.isRead && styles.rowUnread,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rowTitleContainer}>
              <Text
                style={[styles.rowTitle, !item.isRead && styles.unread]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.title || t('notifications.untitled')}
              </Text>
              <Text style={styles.rowTime}>{formatInstantTime(item.receivedAt, locale)}</Text>
            </View>
            {item.body !== '' ? <Text style={styles.rowBody}>{item.body}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('notifications.empty')}</Text>}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  headerButtonPressed: { opacity: 0.6 },
  headerButtonLabel: { fontSize: 16, fontWeight: '600', color: colors.brandText },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.background },
  tabLabelActive: { fontWeight: '700', color: colors.brandText },
  listViewport: { backgroundColor: 'transparent' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
  sectionHeader: {
    marginVertical: spacing.sm,
    padding: spacing.md,
    height: 44,
    justifyContent: 'center',
    backgroundColor: colors.brandDark,
    borderRadius: radius.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandLight,
  },
  rowTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Zorg dat de tekst en tijd niet over elkaar heen lopen
    maxWidth: '100%',
  },
  row: {
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowUnread: { backgroundColor: colors.brand },
  pressed: { opacity: 0.78 },
  rowTitle: {
    fontSize: 16,
    color: colors.text,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  unread: { fontWeight: '700' },
  rowBody: { fontSize: 14, color: colors.text },
  rowTime: { fontSize: 12, color: colors.text, flexShrink: 0, marginLeft: spacing.sm },
  separator: { height: spacing.sm },
  empty: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
