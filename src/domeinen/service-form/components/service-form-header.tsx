import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';
import type { ServiceFormProgress } from '../domain/selectors';
import { ProgressCircle } from './progress-circle';

const RELOAD_DOUBLE_TAP_MS = 400;

/** Service name, phase and overall progress, with the service number and plate when known. */
export function ServiceFormHeader({
  serviceName,
  phaseName,
  progress,
  details,
  onReloadDefinitions,
}: {
  serviceName: string;
  phaseName: string;
  progress: ServiceFormProgress;
  details: readonly string[];
  /** Dev-only: a second tap on the progress circle reloads the experiment JSON. */
  onReloadDefinitions?: () => void;
}) {
  const { t } = useTranslation();
  const lastTapAt = useRef(0);
  const onPressProgress = (): void => {
    if (!onReloadDefinitions) {
      return;
    }
    const now = Date.now();
    if (now - lastTapAt.current <= RELOAD_DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      onReloadDefinitions();
      return;
    }
    lastTapAt.current = now;
  };

  const circle = (
    <ProgressCircle
      completed={progress.completed}
      total={progress.total}
      size={48}
      accessible={onReloadDefinitions === undefined}
    />
  );

  return (
    <View style={styles.header}>
      <View style={styles.heading}>
        <View style={styles.text}>
          <Text style={styles.name}>{serviceName}</Text>
          {phaseName ? <Text style={styles.phase}>{phaseName}</Text> : null}
          {details.length > 0 ? <Text style={styles.details}>{details.join(' · ')}</Text> : null}
        </View>
        <View style={styles.progress}>
          {onReloadDefinitions ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('serviceForm.dev.reloadDefinitions')}
              onPress={onPressProgress}
              hitSlop={12}
            >
              {circle}
            </Pressable>
          ) : (
            circle
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    backgroundColor: colors.brandDark,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  name: { color: colors.brandLight, fontSize: 20, fontWeight: '700' },
  phase: { color: colors.brandLight, fontSize: 15, fontWeight: '600' },
  details: { color: colors.brandLight, fontSize: 14 },
  progress: { alignItems: 'center', gap: 2 },
  progressLabel: { color: colors.brandText, fontSize: 12 },
});
