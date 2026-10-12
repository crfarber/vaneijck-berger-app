import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { colors, spacing, type } from '@/shared/ui/theme';
import {
  DISCLOSURE_ORDER,
  nextDisclosureStep,
  nextPermissionStep,
  PERMISSION_KIND,
  PERMISSION_STEP,
  type DisclosureKind,
  type PermissionKind,
  type PermissionSnapshot,
} from '../index';
import {
  useDevicePermissions,
  usePermissionDisclosurePreference,
  usePushRuntime,
} from '../hooks/settings-context';

const ICONS: Record<DisclosureKind, keyof typeof Ionicons.glyphMap> = {
  [PERMISSION_KIND.notifications]: 'notifications-outline',
  [PERMISSION_KIND.location]: 'location-outline',
  [PERMISSION_KIND.camera]: 'camera-outline',
};

const COPY = {
  [PERMISSION_KIND.notifications]: {
    title: 'settings.disclosure.notifications.title',
    explanation: 'settings.disclosure.notifications.explanation',
  },
  [PERMISSION_KIND.location]: {
    title: 'settings.disclosure.location.title',
    explanation: 'settings.disclosure.location.explanation',
  },
  [PERMISSION_KIND.camera]: {
    title: 'settings.disclosure.camera.title',
    explanation: 'settings.disclosure.camera.explanation',
  },
} as const;

type Snapshots = Partial<Record<PermissionKind, PermissionSnapshot>>;

async function readSnapshots(
  permissions: ReturnType<typeof useDevicePermissions>,
): Promise<Snapshots> {
  const next: Snapshots = {};
  for (const kind of DISCLOSURE_ORDER) {
    next[kind] = await permissions.read(kind);
  }
  return next;
}

/** Post-login wizard: notifications → location → camera. Decline skips without blocking the app. */
export function PermissionDisclosureScreen() {
  const { t } = useTranslation();
  const preference = usePermissionDisclosurePreference();
  const permissions = useDevicePermissions();
  const pushRuntime = usePushRuntime();
  const [kind, setKind] = useState<DisclosureKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const resolveStep = useCallback(async (): Promise<DisclosureKind | null> => {
    const seen = await preference.readSeen();
    const snapshots = await readSnapshots(permissions);
    return nextDisclosureStep({ seen, snapshots });
  }, [preference, permissions]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await resolveStep();
      if (cancelled) {
        return;
      }
      if (next === null) {
        router.replace('/');
        return;
      }
      setKind(next);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [resolveStep]);

  const advance = async (): Promise<void> => {
    const next = await resolveStep();
    if (next === null) {
      router.replace('/');
      return;
    }
    setKind(next);
  };

  const finishKind = async (current: DisclosureKind): Promise<void> => {
    await preference.markSeen(current);
    if (current === PERMISSION_KIND.notifications) {
      void pushRuntime.start();
    }
    await advance();
  };

  const onAccept = async (): Promise<void> => {
    if (kind === null || busy) {
      return;
    }
    setBusy(true);
    try {
      const snapshot = await permissions.read(kind);
      const step = nextPermissionStep(snapshot);
      if (step === PERMISSION_STEP.ask) {
        await permissions.request(kind);
      } else if (step === PERMISSION_STEP.openSettings) {
        await new Promise<void>((resolve) => {
          Alert.alert(
            t('settings.disclosure.blockedTitle'),
            t('settings.disclosure.blockedMessage'),
            [
              { text: t('common.close'), style: 'cancel', onPress: () => resolve() },
              {
                text: t('settings.openSystemSettings'),
                onPress: () => {
                  void permissions.openSystemSettings().finally(() => resolve());
                },
              },
            ],
          );
        });
      }
      await finishKind(kind);
    } finally {
      setBusy(false);
    }
  };

  const onLater = async (): Promise<void> => {
    if (kind === null || busy) {
      return;
    }
    setBusy(true);
    try {
      await finishKind(kind);
    } finally {
      setBusy(false);
    }
  };

  if (!ready || kind === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const copy = COPY[kind];

  return (
    <Screen backgroundColor={colors.brand}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name={ICONS[kind]} size={64} color={colors.brandText} />
          </View>
          <Text style={styles.title}>{t(copy.title)}</Text>
          <Text style={styles.explanation}>{t(copy.explanation)}</Text>
        </View>
        <View style={styles.actions}>
          <Button
            label={t('settings.disclosure.accept')}
            onPress={() => void onAccept()}
            loading={busy}
            variant="light"
          />
          <Button
            label={t('settings.disclosure.later')}
            variant="ghost"
            onPress={() => void onLater()}
            disabled={busy}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'space-between', gap: spacing.xl },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.large, color: colors.text, textAlign: 'center', paddingHorizontal: spacing.md },
  explanation: {
    ...type.body,
    color: colors.brandText,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
});
