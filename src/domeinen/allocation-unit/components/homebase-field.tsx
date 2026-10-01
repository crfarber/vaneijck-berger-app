import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import LocationIcon from '@/shared/ui/icons/location';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { formatHomebaseAddress, searchHomebaseLocations } from '../domain/homebase';
import type { HomebasePicker } from '../hooks/use-homebase-picker';

/** "Ik werk deze dienst vanaf:" row plus its searchable bottom sheet. Internal bergers only. */
export function HomebaseField({ picker }: { picker: HomebasePicker }) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const shown = useMemo(
    () => searchHomebaseLocations(picker.locations, query),
    [picker.locations, query],
  );

  if (!picker.enabled) {
    return null;
  }

  const placeholder = t('unit.homebase.placeholder');
  const selected = picker.selected;
  const address = selected === null ? '' : formatHomebaseAddress(selected);

  const close = (): void => {
    setQuery('');
    picker.closeSheet();
  };

  return (
    <>
      <Text style={styles.sectionTitle}>{t('unit.homebase.sectionTitle')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('unit.homebase.sectionTitle')} ${selected?.name ?? placeholder}`}
        onPress={picker.openSheet}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <LocationIcon color={colors.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.title}>{selected?.name ?? placeholder}</Text>
          <Text style={styles.subtitle}>{address || placeholder}</Text>
        </View>
      </Pressable>

      <BottomSheet
        visible={picker.sheetOpen}
        title={t('unit.homebase.sheetTitle')}
        closeLabel={t('common.close')}
        onClose={close}
        height="85%"
      >
        <TextInput
          autoFocus
          autoCorrect={false}
          placeholder={t('unit.homebase.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          accessibilityLabel={t('unit.homebase.searchPlaceholder')}
        />
        <FlatList
          data={shown}
          keyExtractor={(item) => item.location.id}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          style={{ maxHeight: height * 0.6 }}
          initialNumToRender={20}
          ListEmptyComponent={<Text style={styles.empty}>{t('unit.homebase.noResults')}</Text>}
          renderItem={({ item }) => {
            const isSelected = item.location.id === selected?.id;
            const itemAddress = formatHomebaseAddress(item.location);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  setQuery('');
                  picker.select(item.location);
                }}
                style={({ pressed }) => [
                  styles.item,
                  isSelected && styles.itemSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                    {item.location.name}
                  </Text>
                  {item.isNearest ? (
                    <Text style={styles.badge}>{t('unit.homebase.nearest')}</Text>
                  ) : null}
                </View>
                {itemAddress ? (
                  <Text style={[styles.itemSubtext, isSelected && styles.itemTextSelected]}>
                    {itemAddress}
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  pressed: { opacity: 0.6 },
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
  item: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemSelected: { backgroundColor: colors.brand, borderRadius: radius.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemText: { flexShrink: 1, color: colors.text, fontSize: 16 },
  itemSubtext: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  itemTextSelected: { color: colors.brandText, fontWeight: '600' },
  badge: {
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.brandDark,
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  empty: { color: colors.textMuted, fontSize: 15, paddingVertical: spacing.md },
});
