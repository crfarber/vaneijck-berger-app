import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';
import {
  availabilityTone,
  isAvailabilityEditable,
  type AvailabilityTone,
} from '../domain/availability';
import { resolveAvailabilityLabel } from '../domain/availability-label';
import { useAvailabilityOptions } from '../hooks/use-availability-options';
import { useWorker } from '../hooks/use-worker';
import { PreviewModePill } from './preview-mode-pill';

/**
 * Compact availability badge for the stack header. Tapping opens the change screen unless the
 * berger is busy with assignments (display-only). Rebuilt for this app — not a port of TopBar.
 * Route preview (`mode=readonly`) swaps in {@link PreviewModePill}.
 */
export function WorkerStatusPill() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode } = useGlobalSearchParams<{ mode?: string }>();
  const { data: worker } = useWorker();
  const { data: options = [] } = useAvailabilityOptions();
  const code = worker?.dn_availabilitystatuscode;
  const editable = isAvailabilityEditable(code);
  const tone = availabilityTone(code);
  const resolved = resolveAvailabilityLabel(code, options);

  if (mode === 'readonly') {
    return <PreviewModePill />;
  }

  const label =
    resolved.kind === 'text'
      ? resolved.text
      : resolved.kind === 'fallback'
        ? t(`worker.availability.codes.${resolved.key}`)
        : t('worker.availability.unknown');

  const content = (
    <View style={[styles.pill, toneStyles[tone]]} accessibilityRole="text">
      <Text style={[styles.label, tone !== 'warning' ? styles.labelOnDark : styles.labelOnLight]}>
        {label}
      </Text>
    </View>
  );

  if (!editable) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('worker.availability.change')}
      onPress={() => router.push('/availability')}
      hitSlop={spacing.sm}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const toneStyles = StyleSheet.create({
  success: { backgroundColor: colors.success },
  warning: { backgroundColor: colors.warning },
  danger: { backgroundColor: colors.danger },
} satisfies Record<AvailabilityTone, { backgroundColor: string }>);

const styles = StyleSheet.create({
  pill: {
    borderRadius: 25,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.overlay,
  },
  label: { fontSize: 13, fontWeight: '600' },
  labelOnDark: { color: colors.background },
  labelOnLight: { color: colors.text },
  pressed: { opacity: 0.7 },
});
