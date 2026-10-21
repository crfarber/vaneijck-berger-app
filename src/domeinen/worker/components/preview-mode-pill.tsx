import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';

/** Blue header badge: berger is looking, not editing (route preview or form overview). */
export function PreviewModePill() {
  const { t } = useTranslation();
  return (
    <View
      style={styles.pill}
      accessibilityRole="text"
      accessibilityLabel={t('allocations.preview.mode')}
    >
      <Text style={styles.label}>{t('allocations.preview.mode')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 25,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.overlay,
    backgroundColor: colors.brandAction,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.background },
});
