import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';

/** The old `PreviewHeader`: this incident is open to look at, not to change. */
export function PreviewBanner() {
  const { t } = useTranslation();
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        <Text style={styles.label}>{t('allocations.preview.title')}: </Text>
        {t('allocations.preview.details')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.brandAction,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { color: colors.background, fontSize: 14 },
  label: { color: colors.background, fontWeight: '700' },
});
