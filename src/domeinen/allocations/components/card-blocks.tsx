import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import type { ServiceContact, VehicleSummary } from '@/domeinen/services';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { formatIncidentCreatedAt } from '../domain/incident-card';
import { useIncidentAge } from '../hooks/use-incident-age';

export function LocationBlock({ lines }: { lines: readonly string[] }) {
  if (lines.length === 0) {
    return null;
  }
  return (
    <View style={styles.block}>
      {lines.map((line, index) => (
        <Text
          key={`${line}-${index}`}
          style={index === 0 ? styles.locationMain : styles.locationLine}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

export function VehicleBlock({ vehicle }: { vehicle: VehicleSummary }) {
  if (!vehicle.plate && !vehicle.description && !vehicle.color) {
    return null;
  }
  return (
    <View style={styles.block}>
      {vehicle.plate ? <Text style={styles.plate}>{vehicle.plate}</Text> : null}
      {vehicle.description ? <Text style={styles.strong}>{vehicle.description}</Text> : null}
      {vehicle.color ? <Text style={styles.muted}>{vehicle.color}</Text> : null}
    </View>
  );
}

export function PartyBlock({ party }: { party: string | undefined }) {
  return party ? <Text style={styles.muted}>{party}</Text> : null;
}

export function ContactBlock({ contact }: { contact: ServiceContact | undefined }) {
  if (!contact) {
    return null;
  }
  return (
    <View style={styles.block}>
      {contact.name ? <Text style={styles.strong}>{contact.name}</Text> : null}
      {contact.phone ? <Text style={styles.muted}>{contact.phone}</Text> : null}
    </View>
  );
}

export function ReferenceBlock({ reference }: { reference: string | undefined }) {
  const { t } = useTranslation();
  return reference ? (
    <Text style={styles.muted}>{t('allocations.card.lcm', { reference })}</Text>
  ) : null;
}

export function TimeBlock({ createdOn }: { createdOn: string | undefined }) {
  const { i18n, t } = useTranslation();
  const age = useIncidentAge(createdOn);
  if (!createdOn) {
    return null;
  }
  return (
    <View style={styles.time}>
      <Text style={styles.muted}>
        {t('allocations.card.created', {
          value: formatIncidentCreatedAt(createdOn, i18n.language),
        })}
      </Text>
      {age ? (
        <Text style={styles.muted}>{t('allocations.card.elapsed', { value: age })}</Text>
      ) : null}
    </View>
  );
}

export function PhasePill({ label, complete = false }: { label: string; complete?: boolean }) {
  return (
    <View style={[styles.pill, complete && styles.pillComplete]}>
      <Text style={[styles.pillText, complete && styles.pillCompleteText]}>{label}</Text>
    </View>
  );
}

/** Blue icon tile plus dark label — same shape on the incident, service and PLTR cards. */
export function CardActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={12}
      style={styles.actionButton}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color={colors.background} />
      </View>
      <View style={styles.actionLabel}>
        <Text style={styles.actionText}>{label.toUpperCase()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  locationMain: { color: colors.text, fontSize: 15, fontWeight: '600' },
  locationLine: { color: colors.textMuted, fontSize: 14 },
  strong: { color: colors.text, fontSize: 14, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 13 },
  plate: { alignSelf: 'flex-start', color: colors.text, fontSize: 16, fontWeight: '700' },
  time: { gap: spacing.xs },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.xxl,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillComplete: { backgroundColor: colors.success },
  pillText: { color: colors.brandText, fontSize: 12, fontWeight: '700' },
  pillCompleteText: { color: colors.background },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  actionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandAction,
    borderTopLeftRadius: radius.xxl,
    borderBottomLeftRadius: radius.xxl,
  },
  actionLabel: {
    height: 30,
    paddingRight: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.brandDark,
    borderTopRightRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  actionText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
});
