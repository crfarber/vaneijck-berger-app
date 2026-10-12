import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { QRSVG } from '@/shared/ui/icons/qrcode';
import { colors, radius, spacing, type } from '@/shared/ui/theme';
import { searchFleet, type FleetVehicle } from '../domain/fleet';

type ListRow =
  | { kind: 'header'; id: string; title: string }
  | { kind: 'vehicle'; id: string; vehicle: FleetVehicle }
  | { kind: 'empty'; id: string; label: string };

/** Searchable, inline fleet picker for the unit registration wizard. */
export function FleetPickerList({
  vehicles,
  recentVehicles = [],
  selectedId,
  onSelect,
  onScan,
  searchPlaceholder,
  recentTitle,
  allTitle,
  emptyLabel,
}: {
  vehicles: readonly FleetVehicle[];
  recentVehicles?: readonly FleetVehicle[];
  selectedId: string | null | undefined;
  onSelect: (vehicle: FleetVehicle) => void;
  /** Optional QR scan action — only for internal trucks, not trailers. */
  onScan?: () => void;
  searchPlaceholder: string;
  recentTitle?: string;
  allTitle: string;
  emptyLabel: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const recentIds = useMemo(
    () => new Set(recentVehicles.map((vehicle) => vehicle.id)),
    [recentVehicles],
  );
  const shown = useMemo(
    () => searchFleet(vehicles, query).filter((vehicle) => !recentIds.has(vehicle.id)),
    [query, recentIds, vehicles],
  );
  const showRecent = query.trim() === '' && recentTitle !== undefined && recentVehicles.length > 0;

  const rows = useMemo((): readonly ListRow[] => {
    const items: ListRow[] = [];
    if (showRecent && recentTitle !== undefined) {
      items.push({ kind: 'header', id: 'recent-header', title: recentTitle });
      for (const vehicle of recentVehicles) {
        items.push({ kind: 'vehicle', id: `recent-${vehicle.id}`, vehicle });
      }
    }
    items.push({ kind: 'header', id: 'all-header', title: allTitle });
    if (shown.length === 0) {
      items.push({ kind: 'empty', id: 'empty', label: emptyLabel });
    } else {
      for (const vehicle of shown) {
        items.push({ kind: 'vehicle', id: vehicle.id, vehicle });
      }
    }
    return items;
  }, [allTitle, emptyLabel, recentTitle, recentVehicles, showRecent, shown]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.search}
        />
        {onScan ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('unit.scanTruckTitle')}
            onPress={onScan}
            style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}
          >
            <QRSVG color={colors.brandLight} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={styles.sectionTitle}>{item.title}</Text>;
          }
          if (item.kind === 'empty') {
            return <Text style={styles.empty}>{item.label}</Text>;
          }
          return (
            <VehicleRow
              vehicle={item.vehicle}
              selected={item.vehicle.id === selectedId}
              onPress={() => onSelect(item.vehicle)}
            />
          );
        }}
      />
    </View>
  );
}

function VehicleRow({
  vehicle,
  selected,
  onPress,
}: {
  vehicle: FleetVehicle;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.name}>{vehicle.name}</Text>
      {vehicle.vehicleNumber ? <Text style={styles.number}>{vehicle.vehicleNumber}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm, minHeight: 0 },
  search: {
    ...type.body,
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    flex: 1,
  },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.md, backgroundColor: colors.background },
  sectionTitle: {
    color: colors.textMuted,
    ...type.body,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  pressed: { opacity: 0.65 },
  name: { color: colors.text, ...type.body, fontWeight: '700', flexShrink: 1 },
  number: { color: colors.textMuted, ...type.body, fontWeight: '600' },
  empty: { color: colors.textMuted, ...type.body, paddingVertical: spacing.md },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scanButton: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brandDark,
  },
});
