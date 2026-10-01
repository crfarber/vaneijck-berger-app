import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';
import type { ServiceFormProgress } from '../domain/selectors';
import { ProgressCircle } from './progress-circle';

/** Service name, phase and overall progress, with the service number and plate when known. */
export function ServiceFormHeader({
  serviceName,
  phaseName,
  progress,
  details,
}: {
  serviceName: string;
  phaseName: string;
  progress: ServiceFormProgress;
  details: readonly string[];
}) {
  return (
    <View style={styles.header}>
      <View style={styles.heading}>
        <View style={styles.text}>
          <Text style={styles.name}>{serviceName}</Text>
          {phaseName ? <Text style={styles.phase}>{phaseName}</Text> : null}
          {details.length > 0 ? <Text style={styles.details}>{details.join(' · ')}</Text> : null}
        </View>
        <View style={styles.progress}>
          <ProgressCircle completed={progress.completed} total={progress.total} size={48} />
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
