import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { colors, radius, spacing } from '@/shared/ui/theme';
import type { PlacePrediction, PlacesClient } from '../api/google-places-client';
import { initialAddressSearchQuery } from '../domain/initial-address-search';

/** Search sheet that any screen can mount. Pass the client from `usePlacesClient()`. */
export function AddressSearchSheet({
  visible,
  places,
  initialQuery = '',
  onChoose,
  onClose,
}: {
  visible: boolean;
  places: PlacesClient;
  initialQuery?: string;
  onChoose: (prediction: PlacePrediction) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const initialQueryToSearch = initialAddressSearchQuery(visible, initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(initialQueryToSearch !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialQueryToSearch) {
      return;
    }

    let isCurrentSearch = true;
    void places
      .autocomplete(initialQueryToSearch)
      .then((results) => {
        if (isCurrentSearch) {
          setPredictions(results);
        }
      })
      .catch(() => {
        if (isCurrentSearch) {
          setError(t('places.searchFailed'));
        }
      })
      .finally(() => {
        if (isCurrentSearch) {
          setLoading(false);
        }
      });

    return () => {
      isCurrentSearch = false;
    };
  }, [initialQueryToSearch, places, t]);

  const reset = (): void => {
    setQuery('');
    setPredictions([]);
    setError(null);
    setLoading(false);
  };

  const close = (): void => {
    reset();
    onClose();
  };

  const search = async (): Promise<void> => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPredictions(await places.autocomplete(trimmed));
    } catch {
      setError(t('places.searchFailed'));
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('places.searchTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      height="80%"
      footer={
        <Button
          label={t('places.search')}
          onPress={() => void search()}
          loading={loading}
          disabled={query.trim().length < 2}
        />
      }
    >
      <TextInput
        autoFocus
        autoCorrect={false}
        placeholder={t('places.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void search()}
        returnKeyType="search"
        style={styles.search}
      />
      {loading ? <ActivityIndicator color={colors.brandAction} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={predictions}
        keyExtractor={(item) => item.placeId}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              reset();
              onChoose(item);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowText}>{item.description}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading && query.trim().length >= 2 && !error && predictions.length === 0 ? (
            <Text style={styles.empty}>{t('places.noResults')}</Text>
          ) : (
            <View />
          )
        }
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  loader: { marginVertical: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.sm },
  empty: { color: colors.textMuted, paddingVertical: spacing.md },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { color: colors.text, fontSize: 16 },
  pressed: { opacity: 0.6 },
});
