import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { colors, radius, spacing } from '@/shared/ui/theme';
import type { Colleague } from '../domain/types';
import { useReassign } from '../hooks/use-reassign';

/** Colleague search for a pending allocation, in a sheet over the list. Mounted only while open,
 * so every open starts with an empty search and loads the names fresh. Tapping a name reassigns
 * right away, same as the old `ForwardAssignment`. */
export function AllocationReassignSheet({
  incidentId,
  visible,
  onClose,
}: {
  incidentId: string;
  visible: boolean;
  onClose: () => void;
}) {
  return visible ? <ReassignSheetContent incidentId={incidentId} onClose={onClose} /> : null;
}

function ReassignSheetContent({
  incidentId,
  onClose,
}: {
  incidentId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colleagues, isLoading, search, setSearch, busyId, reassignTo } = useReassign(incidentId, {
    onSubmitting: onClose,
  });

  return (
    <BottomSheet
      visible
      title={t('allocations.actions.forward')}
      closeLabel={t('common.cancel')}
      onClose={onClose}
    >
      <TextInput
        autoFocus
        autoCorrect={false}
        placeholder={t('allocations.reassign.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      {isLoading ? (
        <ActivityIndicator color={colors.text} style={styles.loading} />
      ) : (
        <FlatList<Colleague>
          data={colleagues}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('allocations.reassign.noColleagues')}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => void reassignTo(item.workerId)}
              disabled={busyId !== null}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Text style={styles.itemText}>{item.name}</Text>
              {busyId === item.workerId ? <ActivityIndicator color={colors.text} /> : null}
            </Pressable>
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  list: { flexGrow: 0, maxHeight: 360 },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  itemText: { color: colors.text, fontSize: 16 },
  loading: { padding: spacing.lg },
  empty: { color: colors.textMuted, fontSize: 15, paddingVertical: spacing.md },
});
