import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReferenceDataSyncStatus, ReferenceDataTopicStatus } from '@/domeinen/reference-data';
import { Screen } from '@/shared/ui/screen';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { useReferenceDataService } from '../hooks/settings-context';

const STATUS_COLOR = {
  idle: colors.textMuted,
  syncing: colors.info,
  succeeded: colors.success,
  failed: colors.error,
} as const satisfies Record<ReferenceDataSyncStatus['phase'], string>;

const STATUS_KEY = {
  idle: 'settings.referenceData.status.idle',
  syncing: 'settings.referenceData.status.syncing',
  succeeded: 'settings.referenceData.status.succeeded',
  failed: 'settings.referenceData.status.failed',
} as const;

type DisplayTopicPhase = ReferenceDataTopicStatus['phase'] | 'available';

const TOPIC_STATUS_COLOR = {
  pending: colors.textMuted,
  syncing: colors.info,
  succeeded: colors.success,
  failed: colors.error,
  available: colors.success,
} as const satisfies Record<DisplayTopicPhase, string>;

const TOPIC_STATUS_KEY = {
  pending: 'settings.referenceData.topicStatus.pending',
  syncing: 'settings.referenceData.topicStatus.syncing',
  succeeded: 'settings.referenceData.topicStatus.succeeded',
  failed: 'settings.referenceData.topicStatus.failed',
  available: 'settings.referenceData.topicStatus.available',
} as const;

/** Shows the outcome of the reference-data sync and lets the user retry one topic or all failed. */
export function ReferenceDataSyncScreen() {
  const { t } = useTranslation();
  const referenceData = useReferenceDataService();
  const [status, setStatus] = useState(() => referenceData.getSyncStatus());
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [refreshingName, setRefreshingName] = useState<string | null>(null);

  useEffect(() => referenceData.subscribeToSyncStatus(setStatus), [referenceData]);

  useEffect(() => {
    let cancelled = false;
    void referenceData.listEntities().then((topics) => {
      if (!cancelled) {
        setAvailableTopics(topics);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [referenceData, status.phase]);

  const retry = (): void => {
    void referenceData.sync().catch(() => undefined);
  };

  const refreshTopic = (name: string): void => {
    setRefreshingName(name);
    void referenceData
      .refreshEntity(name)
      .catch(() => undefined)
      .finally(() => setRefreshingName(null));
  };

  const busy = status.phase === 'syncing' || refreshingName !== null;
  const topicNames = new Set(status.topics.map((topic) => topic.name));
  const topics: ReadonlyArray<ReferenceDataTopicStatus | { name: string; phase: 'available' }> = [
    ...status.topics,
    ...availableTopics
      .filter((name) => !topicNames.has(name))
      .map((name) => ({ name, phase: 'available' as const })),
  ];

  return (
    <Screen>
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status.phase] }]} />
          <Text style={styles.status}>{t(STATUS_KEY[status.phase])}</Text>
          {status.phase === 'failed' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.referenceData.retry')}
              hitSlop={spacing.sm}
              disabled={busy}
              onPress={retry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Ionicons name="refresh" size={24} color={colors.brandText} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.hint}>{t('settings.referenceData.hint')}</Text>
      </View>

      {topics.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>
            {t('settings.referenceData.topics', { count: topics.length })}
          </Text>
          <View style={styles.list}>
            {topics.map((topic) => {
              const topicBusy = refreshingName === topic.name || topic.phase === 'syncing';
              return (
                <View key={topic.name} style={styles.topic}>
                  <View
                    style={[styles.topicDot, { backgroundColor: TOPIC_STATUS_COLOR[topic.phase] }]}
                  />
                  <Text style={styles.entity}>{topic.name}</Text>
                  <Text style={styles.topicStatus}>{t(TOPIC_STATUS_KEY[topic.phase])}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.referenceData.refreshTopic', {
                      name: topic.name,
                    })}
                    hitSlop={spacing.sm}
                    disabled={busy}
                    onPress={() => refreshTopic(topic.name)}
                    style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                  >
                    {topicBusy ? (
                      <ActivityIndicator color={colors.brandText} />
                    ) : (
                      <Ionicons name="refresh" size={22} color={colors.brandText} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : status.phase === 'succeeded' ? (
        <Text style={styles.empty}>{t('settings.referenceData.noChanges')}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  status: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  hint: { fontSize: 14, color: colors.textMuted },
  retryButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  section: { gap: spacing.sm },
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  list: { gap: spacing.sm },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.brandLight,
  },
  topicDot: { width: 8, height: 8, borderRadius: 4 },
  entity: { flex: 1, fontSize: 15, color: colors.text },
  topicStatus: { fontSize: 14, color: colors.textMuted },
  empty: { fontSize: 14, color: colors.textMuted },
});
