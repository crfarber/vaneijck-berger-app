import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, type } from '@/shared/ui/theme';

/** Filled fields out of the required ones as a growing ring; a check once everything is done. */
export function ProgressCircle({
  completed,
  total,
  size = 36,
  accessible = true,
}: {
  completed: number;
  total: number;
  size?: number;
  accessible?: boolean;
}) {
  const done = total > 0 && completed >= total;
  const stroke = Math.max(3, size / 12);
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? Math.min(Math.max(completed / total, 0), 1) : 0;

  return (
    <View
      accessibilityLabel={`${completed}/${total}`}
      accessible={accessible}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        done && styles.done,
      ]}
    >
      {done ? (
        <Ionicons name="checkmark" size={size * 0.55} color={colors.background} />
      ) : (
        <>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.border}
              strokeWidth={stroke}
              fill="none"
            />
            {fraction > 0 ? (
              <G rotation="-90" origin={`${center}, ${center}`}>
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={colors.brand}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={circumference * (1 - fraction)}
                  strokeLinecap="round"
                />
              </G>
            ) : null}
          </Svg>
          <Text style={styles.label}>
            {completed}/{total}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  done: { backgroundColor: colors.success },
  label: { ...type.small },
});
