import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/shared/ui/theme';
import type { AvailabilityOption } from '../domain/availability';
import { useAvailabilityOptions } from '../hooks/use-availability-options';
import { useSetAvailability } from '../hooks/use-set-availability';

/**
 * Pick a new availability status. External bergers only see available / unavailable; internals
 * see everything except "busy". Tapping writes immediately and returns to the previous screen.
 */
export function AvailabilityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { choosable, isPending, isError, refetch } = useAvailabilityOptions();
  const { setAvailability, busyCode } = useSetAvailability();

  const handlePress = async (option: AvailabilityOption): Promise<void> => {
    const ok = await setAvailability(option.value);
    if (ok) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {isPending ? (
        <ActivityIndicator color={colors.text} style={styles.center} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.message}>{t('worker.availability.loadFailed')}</Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={styles.retry}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<AvailabilityOption>
          data={choosable}
          keyExtractor={(item) => String(item.value)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.message}>{t('worker.availability.empty')}</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => void handlePress(item)}
              disabled={busyCode !== null}
              style={styles.row}
            >
              <Text style={styles.rowText}>{item.text}</Text>
              {busyCode === item.value ? <ActivityIndicator color={colors.text} /> : null}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent', padding: spacing.md, gap: spacing.md },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  rowText: { color: colors.text, fontSize: 15, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  message: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  retry: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
