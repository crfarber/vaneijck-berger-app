import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/domeinen/auth/ui';
import { useWorker } from '@/domeinen/worker/ui';
import { Button } from '@/shared/ui/button';
import { BroomWide } from '@/shared/ui/icons/broom-wide';
import { DebugIcon } from '@/shared/ui/icons/debug';
import { FilesIcon } from '@/shared/ui/icons/files';
import { GlobeIcon } from '@/shared/ui/icons/globe';
import { ShieldIcon } from '@/shared/ui/icons/shield';
import { Screen } from '@/shared/ui/screen';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { colors, spacing } from '@/shared/ui/theme';
import { SettingsMenuRow } from '../components/settings-menu-row';
import { SettingsWorkerBar } from '../components/settings-worker-bar';
import { useSignOutGuard } from '../hooks/settings-context';

const appVersion = Constants.expoConfig?.version ?? '';

type MenuItem = {
  key: string;
  labelKey:
    | 'settings.language.title'
    | 'settings.permissions.open'
    | 'settings.referenceData.open'
    | 'support.open'
    | 'debug.open';
  route: '/language' | '/permissions' | '/reference-data-sync' | '/support' | '/debug';
  icon: ReactNode;
  devOnly?: boolean;
};

const MENU_ITEMS: readonly MenuItem[] = [
  {
    key: 'language',
    labelKey: 'settings.language.title',
    route: '/language',
    icon: <GlobeIcon size={20} color={colors.text} />,
  },
  {
    key: 'permissions',
    labelKey: 'settings.permissions.open',
    route: '/permissions',
    icon: <ShieldIcon size={20} color={colors.text} />,
  },
  {
    key: 'sync',
    labelKey: 'settings.referenceData.open',
    route: '/reference-data-sync',
    icon: <BroomWide size={20} color={colors.text} />,
  },
  {
    key: 'support',
    labelKey: 'support.open',
    route: '/support',
    icon: <FilesIcon size={20} color={colors.text} />,
  },
  {
    key: 'debug',
    labelKey: 'debug.open',
    route: '/debug',
    icon: <DebugIcon size={20} color={colors.text} />,
    devOnly: true,
  },
];

/**
 * Worker strip (refreshable), then a general menu (language, permissions, sync, support, debug)
 * and the app version above sign-out.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const signOutGuard = useSignOutGuard();
  const statusOverlay = useStatusOverlay();
  const userType = useSession((state) => state.userType);
  const { data: worker, refetch, isRefetching } = useWorker();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userTypeLabel = userType === null ? '' : userType.toUpperCase();
  const workerName = worker?.dn_name?.trim() || t('settings.worker.unknown');
  const visibleItems = MENU_ITEMS.filter((item) => item.devOnly !== true || __DEV__);

  const refreshWorker = async (): Promise<void> => {
    if (refreshing || isRefetching) {
      return;
    }
    setRefreshing(true);
    try {
      const result = await refetch();
      if (result.error) {
        Alert.alert(
          t('settings.worker.refreshFailedTitle'),
          t('settings.worker.refreshFailedMessage'),
          [{ text: t('common.ok') }],
        );
        return;
      }
      Alert.alert(t('settings.worker.refreshedTitle'), t('settings.worker.refreshedMessage'), [
        { text: t('common.ok') },
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const signOut = async (): Promise<void> => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      let blockedByActiveWork = false;
      await statusOverlay.run(t('feedback.processing.signOut'), async () => {
        const result = await signOutGuard.signOut();
        if (!result.ok) {
          if (result.error === 'active-work') {
            blockedByActiveWork = true;
            return { tone: 'none' };
          }
          return {
            tone: 'error',
            message: t('settings.signOutCancelFailed.message'),
          };
        }
        return { tone: 'none' };
      });
      if (blockedByActiveWork) {
        Alert.alert(t('settings.signOutBlocked.title'), t('settings.signOutBlocked.message'), [
          { text: t('common.ok') },
        ]);
      }
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen
      contentStyle={styles.content}
      footer={
        <Button
          label={t('common.signOut')}
          variant="danger"
          onPress={() => void signOut()}
          loading={signingOut}
        />
      }
    >
      <SettingsWorkerBar
        name={workerName}
        userTypeLabel={userTypeLabel}
        refreshing={refreshing || isRefetching}
        onRefresh={() => void refreshWorker()}
        accessibilityLabel={t('settings.worker.refresh')}
      />
      <Text style={styles.section}>{t('settings.section.general')}</Text>
      <View style={styles.list}>
        {visibleItems.map((item, index) => (
          <SettingsMenuRow
            key={item.key}
            label={t(item.labelKey)}
            icon={item.icon}
            onPress={() => router.push(item.route)}
            showDivider={index < visibleItems.length - 1}
          />
        ))}
      </View>
      <View style={styles.versionWrap}>
        <Text style={styles.version}>
          {userTypeLabel === ''
            ? appVersion
            : t('settings.version', { version: appVersion, userType: userTypeLabel })}
        </Text>
      </View>
    </Screen>
  );
}

/** Cog in the stack header; opens the settings screen. */
export function SettingsHeaderButton() {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.open')}
      onPress={() => router.push('/settings')}
      style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
      hitSlop={spacing.sm}
    >
      <Ionicons name="cog-outline" size={24} color={colors.brandText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 0, gap: 0 },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  list: { backgroundColor: colors.background },
  versionWrap: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  version: { fontSize: 12, color: colors.text, textAlign: 'center' },
  headerButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  headerButtonPressed: { opacity: 0.6 },
});
