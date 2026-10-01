import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';

type Segment = { key: string; label: string; value: boolean | null };

/**
 * Yes/no as two segments, or three for an optional field: the middle one clears the choice, like
 * the old app's three-way toggle.
 */
export function BooleanToggle({
  value,
  optional,
  labels,
  hasError,
  onChange,
}: {
  value: boolean | null;
  optional: boolean;
  labels: { yes: string; no: string; clear: string };
  hasError: boolean;
  onChange: (next: boolean | null) => void;
}) {
  const segments: Segment[] = optional
    ? [
        { key: 'yes', label: labels.yes, value: true },
        { key: 'clear', label: '–', value: null },
        { key: 'no', label: labels.no, value: false },
      ]
    : [
        { key: 'yes', label: labels.yes, value: true },
        { key: 'no', label: labels.no, value: false },
      ];

  return (
    <View style={[styles.row, hasError && styles.rowError]}>
      {segments.map((segment) => {
        const active = value === segment.value;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="button"
            accessibilityLabel={segment.value === null ? labels.clear : segment.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(segment.value)}
            style={({ pressed }) => [
              styles.segment,
              segment.value === null && styles.clearSegment,
              active && styles.active,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{segment.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  rowError: { borderColor: colors.danger },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
  },
  clearSegment: { flex: 0.5 },
  active: { backgroundColor: colors.brand },
  pressed: { opacity: 0.6 },
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  activeLabel: { color: colors.brandText },
});
