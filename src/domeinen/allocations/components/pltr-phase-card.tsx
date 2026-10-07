import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import type { PltrCard } from '@/domeinen/services';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { formatIncidentClock } from '../domain/incident-card';
import { CardActionButton, PhasePill } from './card-blocks';

/**
 * Dark load/delivery face from the old `PLTRServiceCard`: phase, date, address, navigate / call.
 * Preview hides navigate (old `mode === 'readonly'`); call stays when a number is known.
 */
export function PltrPhaseCard({
  card,
  onNavigate,
  onCall,
  preview = false,
}: {
  card: PltrCard;
  onNavigate: () => void;
  onCall: () => void;
  preview?: boolean;
}) {
  const { t } = useTranslation();
  const callLabel = card.phase === 'load' ? t('pltr.callLoad') : t('pltr.callDelivery');
  const date = card.createdOn ? formatIncidentClock(card.createdOn)?.date : undefined;
  const showNavigate = !preview && card.showNavigate;
  const showCall = card.showCall;
  const lines = [card.name, card.streetLine, card.localityLine, card.country].filter(
    (line): line is string => Boolean(line),
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.pills}>
          <PhasePill label={t(card.phase === 'load' ? 'pltr.load' : 'pltr.delivery')} />
          {card.complete ? <PhasePill label={t('pltr.phaseDone')} complete /> : null}
        </View>
        {date ? <Text style={styles.date}>{date}</Text> : null}
      </View>

      {lines.length > 0 ? (
        <View style={styles.address}>
          {lines.map((line, index) => (
            <Text key={`${line}-${index}`} style={index === 0 ? styles.name : styles.addressLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {showNavigate || showCall ? (
        <View style={styles.actions}>
          {showNavigate ? (
            <CardActionButton label={t('pltr.navigate')} icon="navigate" onPress={onNavigate} />
          ) : null}
          {showCall ? <CardActionButton label={callLabel} icon="call" onPress={onCall} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pills: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  date: { color: colors.background, fontSize: 14, fontWeight: '600' },
  address: { gap: spacing.xs },
  name: { color: colors.background, fontSize: 15, fontWeight: '700' },
  addressLine: { color: colors.background, fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
