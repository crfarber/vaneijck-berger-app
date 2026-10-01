import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/ui/theme';
import type { CameraZoomPreset } from '../domain/camera-zoom';

type PhotoZoomControlsProps = {
  presets: readonly CameraZoomPreset[];
  activeLabel: string | null;
  onSelect: (preset: CameraZoomPreset) => void;
};

/** Compact × buttons (0.5 / 1 / 2) above the shutter, similar to the stock camera. */
export function PhotoZoomControls({ presets, activeLabel, onSelect }: PhotoZoomControlsProps) {
  if (presets.length < 2) {
    return null;
  }

  return (
    <View style={styles.row}>
      {presets.map((preset) => {
        const active = preset.label === activeLabel;
        return (
          <Pressable
            key={`${preset.label}-${preset.lens ?? 'digital'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${preset.label}×`}
            onPress={() => onSelect(preset)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset.label}×</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    minWidth: 44,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  chipActive: {
    backgroundColor: colors.brand,
  },
  chipText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.text,
  },
});
