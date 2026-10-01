import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { colors, radius, spacing } from '@/shared/ui/theme';
import {
  nextPermissionStep,
  PERMISSION_KIND,
  PERMISSION_STEP,
  type PermissionKind,
  type PermissionSnapshot,
} from '../index';
import { useDevicePermissions } from '../hooks/settings-context';

const KINDS = [
  PERMISSION_KIND.location,
  PERMISSION_KIND.notifications,
  PERMISSION_KIND.camera,
] as const;

type Snapshots = Partial<Record<PermissionKind, PermissionSnapshot>>;

function statusKey(status: PermissionSnapshot['status']) {
  switch (status) {
    case 'granted':
      return 'settings.status.granted' as const;
    case 'denied':
      return 'settings.status.denied' as const;
    case 'undetermined':
      return 'settings.status.undetermined' as const;
  }
}

const COPY = {
  location: {
    title: 'settings.location.title',
    explanation: 'settings.location.explanation',
  },
  notifications: {
    title: 'settings.notifications.title',
    explanation: 'settings.notifications.explanation',
  },
  camera: {
    title: 'settings.camera.title',
    explanation: 'settings.camera.explanation',
  },
} as const;

/** Location, notifications and camera: status, ask, or open system settings. */
export function PermissionsScreen() {
  const { t } = useTranslation();
  const permissions = useDevicePermissions();
  const [snapshots, setSnapshots] = useState<Snapshots>({});
  const [busy, setBusy] = useState<PermissionKind | null>(null);

  const load = useCallback(async (): Promise<Snapshots> => {
    const next: Snapshots = {};
    for (const kind of KINDS) {
      next[kind] = await permissions.read(kind);
    }
    return next;
  }, [permissions]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void load().then((next) => {
        if (!cancelled) {
          setSnapshots(next);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const ask = async (kind: PermissionKind): Promise<void> => {
    setBusy(kind);
    try {
      const next = await permissions.request(kind);
      setSnapshots((current) => ({ ...current, [kind]: next }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Text style={styles.intro}>{t('settings.permissions.intro')}</Text>
      {KINDS.map((kind) => {
        const snapshot = snapshots[kind];
        const step = snapshot === undefined ? null : nextPermissionStep(snapshot);
        return (
          <View key={kind} style={styles.card}>
            <Text style={styles.title}>{t(COPY[kind].title)}</Text>
            <Text style={styles.explanation}>{t(COPY[kind].explanation)}</Text>
            <Text style={styles.status}>
              {snapshot === undefined ? t('common.loading') : t(statusKey(snapshot.status))}
            </Text>
            {step === PERMISSION_STEP.ask ? (
              <Button
                label={t('settings.ask')}
                onPress={() => void ask(kind)}
                loading={busy === kind}
              />
            ) : null}
            {step === PERMISSION_STEP.openSettings ? (
              <Button
                label={t('settings.openSystemSettings')}
                variant="secondary"
                onPress={() => void permissions.openSystemSettings()}
              />
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, color: colors.textMuted },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  explanation: { fontSize: 14, color: colors.text },
  status: { fontSize: 14, color: colors.textMuted },
});
