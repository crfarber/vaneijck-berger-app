import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { TextField } from '@/shared/ui/text-field';
import { colors, radius, spacing } from '@/shared/ui/theme';
import type { DebugSnapshot } from './collect-debug-snapshot';
import { useDevTools, type FakeStandbyResult } from './dev-tools-context';

function resolveErrorMessage(
  t: TFunction,
  reason: NonNullable<FakeStandbyResult['resolveError']>,
): string {
  switch (reason) {
    case 'invalid-input':
      return t('debug.standbyResolve.invalid-input');
    case 'address-not-found':
      return t('debug.standbyResolve.address-not-found');
    case 'places-unavailable':
      return t('debug.standbyResolve.places-unavailable');
    case 'no-coordinates':
      return t('debug.standbyResolve.no-coordinates');
  }
}

function SnapshotBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text selectable style={styles.json}>
        {JSON.stringify(value, null, 2)}
      </Text>
    </View>
  );
}

/**
 * Inspects SecureStore keys, the session Zustand store and the query cache.
 * Only available while Metro is running (__DEV__). Never logs the snapshot.
 */
export function DebugScreen() {
  const { t } = useTranslation();
  const {
    loadDebugSnapshot,
    copyAccessToken,
    fakeStandbyLocationAdvice,
    clearStandbyLocationAdvice,
  } = useDevTools();
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyingToken, setCopyingToken] = useState(false);
  const [standbyBusy, setStandbyBusy] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [houseNumber, setHouseNumber] = useState('');

  useEffect(() => {
    if (!__DEV__) {
      router.replace('/');
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await loadDebugSnapshot());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  }, [loadDebugSnapshot, t]);

  const copyToken = useCallback(async (): Promise<void> => {
    setCopyingToken(true);
    try {
      const copied = await copyAccessToken();
      Alert.alert(
        t('debug.copyAccessToken'),
        t(copied ? 'debug.copyAccessTokenCopied' : 'debug.copyAccessTokenUnavailable'),
      );
    } catch {
      Alert.alert(t('debug.copyAccessToken'), t('debug.copyAccessTokenFailed'));
    } finally {
      setCopyingToken(false);
    }
  }, [copyAccessToken, t]);

  const confirmCopyToken = (): void => {
    Alert.alert(t('debug.copyAccessTokenTitle'), t('debug.copyAccessTokenWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('debug.copyAccessTokenConfirm'), onPress: () => void copyToken() },
    ]);
  };

  const fakeStandby = useCallback(async (): Promise<void> => {
    setStandbyBusy(true);
    try {
      const result = await fakeStandbyLocationAdvice({ postalCode, houseNumber });
      if (result.resolveError !== undefined) {
        Alert.alert(t('debug.standbyTitle'), resolveErrorMessage(t, result.resolveError));
        return;
      }
      const message = result.bannerVisible
        ? t('debug.standbySetVisible', { address: result.label })
        : t('debug.standbySetHidden', {
            address: result.label,
            status: result.status ?? 'null',
            blocking: result.hasBlockingItems ? 'yes' : 'no',
          });
      Alert.alert(t('debug.standbyTitle'), message, [
        { text: t('common.ok') },
        {
          text: t('debug.standbyOpenAllocations'),
          onPress: () => router.replace('/'),
        },
      ]);
    } catch {
      Alert.alert(t('debug.standbyTitle'), t('common.somethingWrong'));
    } finally {
      setStandbyBusy(false);
    }
  }, [fakeStandbyLocationAdvice, houseNumber, postalCode, t]);

  const clearStandby = useCallback(async (): Promise<void> => {
    setStandbyBusy(true);
    try {
      await clearStandbyLocationAdvice();
      Alert.alert(t('debug.standbyTitle'), t('debug.standbyCleared'));
    } catch {
      Alert.alert(t('debug.standbyTitle'), t('common.somethingWrong'));
    } finally {
      setStandbyBusy(false);
    }
  }, [clearStandbyLocationAdvice, t]);

  if (!__DEV__) {
    return null;
  }

  return (
    <Screen>
      <Text style={styles.heading}>{t('debug.title')}</Text>
      <Text style={styles.hint}>{t('debug.hint')}</Text>
      <Button label={t('debug.refresh')} onPress={() => void refresh()} loading={loading} />
      <Button
        label={t('debug.copyAccessToken')}
        onPress={confirmCopyToken}
        loading={copyingToken}
      />
      <View style={styles.standbyFields}>
        <Text style={styles.standbyHint}>{t('debug.standbyAddressHint')}</Text>
        <View style={styles.standbyRow}>
          <TextField
            label={t('debug.standbyPostalCode')}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder={t('debug.standbyPostalCodePlaceholder')}
            autoCapitalize="characters"
            maxLength={7}
            containerStyle={styles.postalField}
          />
          <TextField
            label={t('debug.standbyHouseNumber')}
            value={houseNumber}
            onChangeText={setHouseNumber}
            placeholder={t('debug.standbyHouseNumberPlaceholder')}
            keyboardType="number-pad"
            maxLength={6}
            containerStyle={styles.houseField}
          />
        </View>
      </View>
      <Button
        label={t('debug.fakeStandby')}
        onPress={() => void fakeStandby()}
        loading={standbyBusy}
        variant="secondary"
      />
      <Button
        label={t('debug.clearStandby')}
        onPress={() => void clearStandby()}
        loading={standbyBusy}
        variant="ghost"
      />
      {error !== null ? <Text style={styles.error}>{error}</Text> : null}
      {snapshot !== null ? (
        <>
          <SnapshotBlock title={t('debug.storage')} value={snapshot.storage} />
          <SnapshotBlock title={t('debug.sessionStore')} value={snapshot.sessionStore} />
          <SnapshotBlock title={t('debug.tokenProvider')} value={snapshot.tokenProvider} />
          <SnapshotBlock title={t('debug.queryCache')} value={snapshot.queryCache} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: '700', color: colors.text },
  hint: { fontSize: 14, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 14 },
  standbyFields: { gap: spacing.sm },
  standbyHint: { fontSize: 13, color: colors.textMuted },
  standbyRow: { flexDirection: 'row', gap: spacing.sm },
  postalField: { flex: 2 },
  houseField: { flex: 1 },
  block: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  json: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: colors.text,
  },
});
