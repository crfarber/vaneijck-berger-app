import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  EntityMeta,
  ReferenceDataSyncStatus,
  ReferenceDataTopicStatus,
} from '@/domeinen/reference-data';
import { parseEditableEntityJson } from '@/domeinen/reference-data';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { TextField } from '@/shared/ui/text-field';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { formatEndDate } from '@/shared/utils/time';
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

type JsonState =
  | { phase: 'loading' | 'missing' | 'error' }
  | { phase: 'ready'; content: string; meta: EntityMeta };

function formatMetaDate(value: string | null, locale: string): string | null {
  return formatEndDate(value, locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Shows the outcome of the reference-data sync and lets the user retry one topic or all failed. */
export function ReferenceDataSyncScreen() {
  const { t, i18n } = useTranslation();
  const referenceData = useReferenceDataService();
  const [status, setStatus] = useState(() => referenceData.getSyncStatus());
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [refreshingName, setRefreshingName] = useState<string | null>(null);
  const [viewedTopic, setViewedTopic] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [jsonState, setJsonState] = useState<JsonState>({ phase: 'loading' });
  const [editingJson, setEditingJson] = useState(false);
  const [editorText, setEditorText] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [savingJson, setSavingJson] = useState(false);
  const [importingJson, setImportingJson] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (viewedTopic === null) return;
    let cancelled = false;
    void Promise.all([
      referenceData.getEntity(viewedTopic),
      referenceData.getEntityMeta(viewedTopic),
    ]).then(
      ([entity, meta]) => {
        if (!cancelled) {
          setJsonState(
            entity === null
              ? { phase: 'missing' }
              : {
                  phase: 'ready',
                  content: JSON.stringify(entity, null, 2),
                  meta: meta ?? { fetchedAt: null, changedAt: null },
                },
          );
        }
      },
      () => {
        if (!cancelled) setJsonState({ phase: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [referenceData, viewedTopic]);

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

  const beginEditingJson = (): void => {
    if (jsonState.phase !== 'ready') return;
    setEditorText(jsonState.content);
    setEditorError(null);
    setEditingJson(true);
  };

  const saveEditedJson = async (): Promise<void> => {
    if (viewedTopic === null) return;
    const parsed = parseEditableEntityJson(editorText);
    if (!parsed.ok && parsed.reason === 'invalid-json') {
      setEditorError(t('settings.referenceData.jsonInvalid'));
      return;
    }
    if (!parsed.ok) {
      setEditorError(t('settings.referenceData.jsonArrayRequired'));
      return;
    }

    setSavingJson(true);
    setEditorError(null);
    try {
      await referenceData.replaceEntityData(viewedTopic, parsed.data);
      const meta = await referenceData.getEntityMeta(viewedTopic);
      setJsonState({
        phase: 'ready',
        content: JSON.stringify(parsed.data, null, 2),
        meta: meta ?? { fetchedAt: null, changedAt: null },
      });
      setEditingJson(false);
    } catch {
      setEditorError(t('settings.referenceData.jsonSaveError'));
    } finally {
      setSavingJson(false);
    }
  };

  const importJsonFile = async (): Promise<void> => {
    if (viewedTopic === null) return;
    setImportingJson(true);
    setImportError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;

      const parsed = parseEditableEntityJson(await new File(asset.uri).text());
      if (!parsed.ok) {
        setImportError(
          t(
            parsed.reason === 'invalid-json'
              ? 'settings.referenceData.jsonInvalid'
              : 'settings.referenceData.jsonArrayRequired',
          ),
        );
        return;
      }

      await referenceData.replaceEntityData(viewedTopic, parsed.data);
      const meta = await referenceData.getEntityMeta(viewedTopic);
      setJsonState({
        phase: 'ready',
        content: JSON.stringify(parsed.data, null, 2),
        meta: meta ?? { fetchedAt: null, changedAt: null },
      });
      setEditingJson(false);
      setEditorError(null);
    } catch {
      setImportError(t('settings.referenceData.jsonImportError'));
    } finally {
      setImportingJson(false);
    }
  };

  const busy = status.phase === 'syncing' || refreshingName !== null;
  const topicNames = new Set(status.topics.map((topic) => topic.name));
  const topics: ReadonlyArray<ReferenceDataTopicStatus | { name: string; phase: 'available' }> = [
    ...status.topics,
    ...availableTopics
      .filter((name) => !topicNames.has(name))
      .map((name) => ({ name, phase: 'available' as const })),
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTopics =
    normalizedQuery === ''
      ? topics
      : topics.filter((topic) => topic.name.toLowerCase().includes(normalizedQuery));

  const fetchedFormatted =
    jsonState.phase === 'ready' ? formatMetaDate(jsonState.meta.fetchedAt, i18n.language) : null;
  const changedFormatted =
    jsonState.phase === 'ready' ? formatMetaDate(jsonState.meta.changedAt, i18n.language) : null;
  const fetchedLabel =
    jsonState.phase === 'ready'
      ? fetchedFormatted === null
        ? t('settings.referenceData.jsonFetchedUnknown')
        : t('settings.referenceData.jsonFetchedAt', { date: fetchedFormatted })
      : null;
  const changedLabel =
    jsonState.phase === 'ready'
      ? changedFormatted === null
        ? t('settings.referenceData.jsonChangedUnknown')
        : t('settings.referenceData.jsonChangedAt', { date: changedFormatted })
      : null;
  // One giant Text blanks out on large form definitions (~200KB+); render line by line instead.
  const jsonLines = useMemo(
    () => (jsonState.phase === 'ready' ? jsonState.content.split('\n') : []),
    [jsonState],
  );

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
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder={t('settings.referenceData.searchPlaceholder')}
            accessibilityLabel={t('settings.referenceData.searchPlaceholder')}
          />
          <Text style={styles.heading}>
            {t('settings.referenceData.topics', { count: filteredTopics.length })}
          </Text>
          {filteredTopics.length === 0 ? (
            <Text style={styles.empty}>{t('settings.referenceData.noSearchResults')}</Text>
          ) : (
            <View style={styles.list}>
              {filteredTopics.map((topic) => {
                const topicBusy = refreshingName === topic.name || topic.phase === 'syncing';
                return (
                  <View key={topic.name} style={styles.topic}>
                    <View
                      style={[
                        styles.topicDot,
                        { backgroundColor: TOPIC_STATUS_COLOR[topic.phase] },
                      ]}
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('settings.referenceData.viewJson', {
                        name: topic.name,
                      })}
                      hitSlop={spacing.sm}
                      onPress={() => {
                        setJsonState({ phase: 'loading' });
                        setViewedTopic(topic.name);
                      }}
                      style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="eye-outline" size={22} color={colors.brandText} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : status.phase === 'succeeded' ? (
        <Text style={styles.empty}>{t('settings.referenceData.noChanges')}</Text>
      ) : null}
      <BottomSheet
        visible={viewedTopic !== null}
        title={viewedTopic ?? ''}
        subtitle={
          fetchedLabel !== null && changedLabel !== null ? (
            <View style={styles.meta}>
              <Text style={styles.metaLine}>{fetchedLabel}</Text>
              <Text style={styles.metaLine}>{changedLabel}</Text>
            </View>
          ) : undefined
        }
        closeLabel={t('common.close')}
        onClose={() => {
          setViewedTopic(null);
          setEditingJson(false);
          setEditorError(null);
          setImportError(null);
        }}
        height="90%"
      >
        {editingJson && jsonState.phase === 'ready' ? (
          <View style={styles.editor}>
            <Text style={styles.hint}>{t('settings.referenceData.jsonEditHint')}</Text>
            <TextField
              value={editorText}
              onChangeText={(value) => {
                setEditorText(value);
                setEditorError(null);
              }}
              accessibilityLabel={t('settings.referenceData.jsonEditorLabel')}
              multiline
              editable={!savingJson}
              autoCapitalize="none"
              error={editorError}
              containerStyle={styles.editorInput}
            />
            <View style={styles.editorActions}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                disabled={savingJson}
                onPress={() => {
                  setEditingJson(false);
                  setEditorError(null);
                }}
              />
              <Button
                label={t('settings.referenceData.saveJson')}
                loading={savingJson}
                onPress={() => void saveEditedJson()}
              />
            </View>
          </View>
        ) : (
          <View style={styles.viewer}>
            <View style={styles.viewerActions}>
              {jsonState.phase === 'ready' ? (
                <Button
                  label={t('settings.referenceData.editJson')}
                  variant="secondary"
                  onPress={beginEditingJson}
                />
              ) : null}
              <Button
                label={t('settings.referenceData.importJson')}
                variant="secondary"
                loading={importingJson}
                disabled={jsonState.phase === 'loading'}
                onPress={() => void importJsonFile()}
              />
            </View>
            {importError ? <Text style={styles.error}>{importError}</Text> : null}
            {jsonState.phase === 'ready' ? (
              <FlatList
                data={jsonLines}
                keyExtractor={(_line, index) => String(index)}
                style={styles.jsonScroll}
                contentContainerStyle={styles.jsonContent}
                initialNumToRender={60}
                maxToRenderPerBatch={40}
                windowSize={11}
                removeClippedSubviews
                renderItem={({ item }) => (
                  <Text selectable style={styles.jsonLine}>
                    {item.length === 0 ? ' ' : item}
                  </Text>
                )}
              />
            ) : (
              <View style={styles.jsonStatus}>
                {jsonState.phase === 'loading' ? (
                  <ActivityIndicator color={colors.brandText} />
                ) : null}
                <Text style={styles.hint}>
                  {t(
                    jsonState.phase === 'loading'
                      ? 'settings.referenceData.jsonLoading'
                      : jsonState.phase === 'missing'
                        ? 'settings.referenceData.jsonMissing'
                        : 'settings.referenceData.jsonError',
                  )}
                </Text>
              </View>
            )}
          </View>
        )}
      </BottomSheet>
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
    width: 44,
    height: 44,
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
  topicStatus: { flexShrink: 1, fontSize: 14, color: colors.textMuted },
  meta: { gap: 2 },
  metaLine: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  jsonScroll: { flex: 1 },
  jsonContent: { paddingBottom: spacing.md },
  viewer: { flex: 1, gap: spacing.sm },
  viewerActions: { alignItems: 'flex-end' },
  editor: { flex: 1, gap: spacing.sm },
  editorInput: { flex: 1 },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  error: { color: colors.danger, fontSize: 14 },
  jsonStatus: { gap: spacing.sm, paddingVertical: spacing.md },
  jsonLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
  },
  empty: { fontSize: 14, color: colors.textMuted },
});
