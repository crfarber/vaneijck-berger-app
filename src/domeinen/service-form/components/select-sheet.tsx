import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { filterSelectOptions, type SelectOption } from '../domain/select-options';

/** The list of choices for one select field, with a search box when the schema asks for one. */
export function SelectSheet({
  title,
  options,
  searchable,
  selectedValue,
  onChoose,
  onClose,
}: {
  title: string;
  options: readonly SelectOption[] | null;
  searchable: boolean;
  selectedValue: unknown;
  onChoose: (option: SelectOption) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const visible = options !== null;
  const shown = options === null ? [] : searchable ? filterSelectOptions(options, query) : options;

  const close = (): void => {
    setQuery('');
    onClose();
  };

  const choose = (option: SelectOption): void => {
    setQuery('');
    onChoose(option);
  };

  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={t('serviceForm.select.close')}
      onClose={close}
    >
      {searchable ? (
        <TextInput
          autoFocus
          autoCorrect={false}
          placeholder={t('serviceForm.select.search')}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
      ) : null}
      <FlatList
        data={shown}
        keyExtractor={(item, index) => `${String(item.value)}-${index}`}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        initialNumToRender={20}
        ListEmptyComponent={<Text style={styles.empty}>{t('serviceForm.select.noResults')}</Text>}
        renderItem={({ item }) => {
          const selected = item.value === selectedValue;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => choose(item)}
              style={({ pressed }) => [
                styles.item,
                selected && styles.itemSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
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
  item: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemSelected: { backgroundColor: colors.brand, borderRadius: radius.sm },
  pressed: { opacity: 0.6 },
  itemText: { color: colors.text, fontSize: 16 },
  itemTextSelected: { color: colors.brandText, fontWeight: '600' },
  empty: { color: colors.textMuted, fontSize: 15, paddingVertical: spacing.md },
});
