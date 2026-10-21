import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';
import type { VehicleReleaseAssignment, VehicleReleaseLocation } from '../domain/types';

/**
 * One release location, collapsed to a count until tapped open. Tapping a vehicle opens the
 * Afgifte form directly (legacy `ReleaseCard` → `ProcessingService` with `isReleaseItem`).
 */
export function VehicleReleaseRow({ location }: { location: VehicleReleaseLocation }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        style={styles.header}
        accessibilityRole="button"
      >
        <Text style={styles.headerText}>
          {location.dn_name ?? t('allocations.unnamed')} ({location.releases.length})
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.list}>
          {location.releases.map((release, index) => (
            <ReleaseAssignmentRow key={release.dn_serviceid ?? index} release={release} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ReleaseAssignmentRow({ release }: { release: VehicleReleaseAssignment }) {
  const router = useRouter();
  const color = release.dn_vwe_vehicleinformationid?.vwe_rdw_kleur1;
  const serviceId = release.dn_serviceid;
  const locationId = release._dn_locationid_value;

  const openForm = (): void => {
    if (!serviceId || !locationId) {
      return;
    }
    router.push({
      pathname: '/vehicle-releases/[locationId]/services/[serviceId]/form',
      params: { locationId, serviceId },
    });
  };

  return (
    <Pressable
      onPress={openForm}
      style={styles.assignment}
      accessibilityRole="button"
      disabled={!serviceId || !locationId}
    >
      <View style={styles.assignmentLeft}>
        {release.dn_vehiclebrand ? (
          <Text style={styles.assignmentText}>{release.dn_vehiclebrand.toUpperCase()}</Text>
        ) : null}
        {release.dn_vehicletradename ? (
          <Text style={styles.assignmentText}>{release.dn_vehicletradename.toUpperCase()}</Text>
        ) : null}
      </View>
      <Text style={styles.assignmentRight}>
        {release.dn_concatlicenseplate?.toUpperCase()}
        {color ? `\n${color.toUpperCase()}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  headerText: { color: colors.brandText, fontSize: 16, fontWeight: '600' },
  list: { marginTop: spacing.xs, gap: spacing.xs },
  assignment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  assignmentLeft: { flex: 1 },
  assignmentText: { color: colors.background, fontSize: 15 },
  assignmentRight: { color: colors.background, fontSize: 15, textAlign: 'right' },
});
