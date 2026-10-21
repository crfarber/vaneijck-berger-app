import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/shared/ui/theme';

type MapCenterButtonProps = {
  visible: boolean;
  busy: boolean;
  onPress: () => void;
};

/**
 * Floating control to re-centre the map on the berger's live GPS (neighbourhood zoom).
 * Sits above the GPS banner so it stays reachable while assignments are not selected.
 */
export function MapCenterButton({ visible, busy, onPress }: MapCenterButtonProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('allocations.map.centerOnMe')}
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={({ pressed }) => [
        styles.button,
        { bottom: Math.max(insets.bottom, spacing.sm) + 88 },
        pressed ? styles.pressed : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.brandAction} size="small" />
      ) : (
        <Ionicons name="locate" size={22} color={colors.brandAction} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
