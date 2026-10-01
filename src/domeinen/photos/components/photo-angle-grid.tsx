import { StyleSheet, View } from 'react-native';
import { spacing } from '@/shared/ui/theme';
import { PhotoPositionButton } from './photo-position-button';

type PhotoAngleGridProps<Value extends string> = {
  options: readonly { value: Value; label: string }[];
  selectedValue: Value | undefined;
  onSelect: (value: Value) => void;
};

export function PhotoAngleGrid<Value extends string>({
  options,
  selectedValue,
  onSelect,
}: PhotoAngleGridProps<Value>) {
  return (
    <View style={styles.grid}>
      {options.map((option) => (
        <View key={option.value} style={styles.item}>
          <PhotoPositionButton
            label={option.label}
            selected={selectedValue === option.value}
            onPress={() => onSelect(option.value)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { width: '48.5%' },
});
