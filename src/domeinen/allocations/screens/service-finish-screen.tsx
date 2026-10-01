import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/shared/ui/button';
import { colors, spacing } from '@/shared/ui/theme';
import { getAllocationTypeKey } from '../domain/type';
import { useAllocations } from '../hooks/use-allocations';
import { useProcessingExit } from '../hooks/use-processing-exit';
import { useServices } from '../hooks/use-services';

/**
 * The closing screen for a service already at HULPVERLENING_AFGEROND — ported from
 * `ProcessingFinishedWrapper`'s seam only. That wrapper crosses into the actual `ProcessingFinish`
 * form with exactly one signal back (`handleSubmitFinishedService`, no data of its own — the exit
 * flow itself never posts anything for a "finish"); the form's own content is the team's rebuild
 * (docs/legacy.md), so this screen shows the service and that one action, nothing more.
 */
export function ServiceFinishScreen({
  allocationId,
  serviceId,
}: {
  allocationId: string;
  serviceId: string;
}) {
  const { t } = useTranslation();
  const { sections, isPending: allocationsPending } = useAllocations();
  const [active, pending] = sections;
  const allocation = [...active.data, ...pending.data].find(
    (item) => item.dn_allocationid === allocationId,
  );
  const incidentId = allocation?.incident.dn_incidentid ?? '';
  const servicesQuery = useServices(incidentId, allocation?.services ?? null);
  const { exit } = useProcessingExit();
  const [busy, setBusy] = useState(false);

  const services = servicesQuery.data ?? allocation?.services ?? [];
  const service = services.find((item) => item.dn_serviceid === serviceId);

  if (allocationsPending || !allocation || !service) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const handleFinish = (): void => {
    setBusy(true);
    exit({
      trigger: 'finish',
      fromProcessingFinish: true,
      allocationId,
      serviceId,
      incidentId,
      serviceTypeCode: service.dn_servicetypecode ?? undefined,
      allocationTypeCode: allocation.type,
      services,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Text style={styles.type}>
        {t(`allocationType.${getAllocationTypeKey(service.dn_servicetypecode)}`)}
      </Text>
      {service.dn_servicenumber ? (
        <Text style={styles.detail}>{service.dn_servicenumber}</Text>
      ) : null}
      {service.dn_driverfullname ? (
        <Text style={styles.detail}>{service.dn_driverfullname}</Text>
      ) : null}
      {service.dn_concatlicenseplate ? (
        <Text style={styles.detail}>{service.dn_concatlicenseplate}</Text>
      ) : null}
      <Button label={t('services.finish.submit')} onPress={handleFinish} loading={busy} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent', padding: spacing.lg, gap: spacing.sm },
  type: { color: colors.text, fontSize: 20, fontWeight: '700' },
  detail: { color: colors.text, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
