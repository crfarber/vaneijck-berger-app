import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { searchFleet, type FleetVehicle } from '../domain/fleet';

/**
 * Searchable fleet list in a bottom sheet — trucks or trailers. Trailer mode can skip
 * (no trailer) via the footer button.
 */
export function FleetPickerSheet({
  visible,
  title,
  vehicles,
  selectedId,
  onSelect,
  onClose,
  skipLabel,
  onSkip,
}: {
  visible: boolean;
  title: string;
  vehicles: readonly FleetVehicle[];
  selectedId?: string | null;
  onSelect: (vehicle: FleetVehicle) => void;
  onClose: () => void;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => searchFleet(vehicles, query), [vehicles, query]);

  const close = (): void => {
    setQuery('');
    onClose();
  };

  const choose = (vehicle: FleetVehicle): void => {
    setQuery('');
    onSelect(vehicle);
  };

  const skip = (): void => {
    setQuery('');
    onSkip?.();
  };

  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={t('common.close')}
      onClose={close}
      height="80%"
      footer={
        skipLabel !== undefined && onSkip !== undefined ? (
          <Button label={skipLabel} variant="secondary" onPress={skip} />
        ) : undefined
      }
    >
      <TextInput
        autoFocus
        autoCorrect={false}
        placeholder={t('unit.searchVehiclePlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        accessibilityLabel={t('unit.searchVehiclePlaceholder')}
      />
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        style={styles.list}
        initialNumToRender={20}
        ListEmptyComponent={<Text style={styles.empty}>{t('unit.noVehiclesFound')}</Text>}
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
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
                {item.name}
              </Text>
              {item.vehicleNumber ? (
                <Text style={[styles.itemSubtext, selected && styles.itemTextSelected]}>
                  {item.vehicleNumber}
                </Text>
              ) : null}
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
  list: { maxHeight: 360 },
  item: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemSelected: { backgroundColor: colors.brand, borderRadius: radius.sm },
  pressed: { opacity: 0.6 },
  itemText: { color: colors.text, fontSize: 16 },
  itemSubtext: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  itemTextSelected: { color: colors.brandText, fontWeight: '600' },
  empty: { color: colors.textMuted, fontSize: 15, paddingVertical: spacing.md },
});
