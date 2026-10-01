import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { searchFleet, type FleetVehicle } from '../domain/fleet';

/** Searchable, inline fleet picker for the unit registration wizard. */
export function FleetPickerList({
  vehicles,
  recentVehicles = [],
  selectedId,
  onSelect,
  searchPlaceholder,
  recentTitle,
  allTitle,
  emptyLabel,
}: {
  vehicles: readonly FleetVehicle[];
  recentVehicles?: readonly FleetVehicle[];
  selectedId: string | null | undefined;
  onSelect: (vehicle: FleetVehicle) => void;
  searchPlaceholder: string;
  recentTitle?: string;
  allTitle: string;
  emptyLabel: string;
}) {
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

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.search}
      />
      {showRecent ? <Text style={styles.sectionTitle}>{recentTitle}</Text> : null}
      {showRecent
        ? recentVehicles.map((vehicle) => (
            <VehicleRow
              key={vehicle.id}
              vehicle={vehicle}
              selected={vehicle.id === selectedId}
              onPress={() => onSelect(vehicle)}
            />
          ))
        : null}
      <Text style={styles.sectionTitle}>{allTitle}</Text>
      {shown.length === 0 ? <Text style={styles.empty}>{emptyLabel}</Text> : null}
      {shown.map((vehicle) => (
        <VehicleRow
          key={vehicle.id}
          vehicle={vehicle}
          selected={vehicle.id === selectedId}
          onPress={() => onSelect(vehicle)}
        />
      ))}
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
  container: { gap: spacing.sm },
  search: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 18,
  },
  sectionTitle: { color: colors.textMuted, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },

  pressed: { opacity: 0.65 },
  name: { color: colors.text, fontSize: 20, fontWeight: '700', flexShrink: 1 },
  number: { color: colors.textMuted, fontSize: 20, fontWeight: '600' },
  empty: { color: colors.textMuted, fontSize: 16, paddingVertical: spacing.md },
});
