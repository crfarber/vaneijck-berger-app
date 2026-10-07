import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getServiceBucket } from '@/domeinen/services';
import { Button } from '@/shared/ui/button';
import { CollapsibleSectionHeader } from '@/shared/ui/collapsible-section-header';
import { colors, spacing, type } from '@/shared/ui/theme';
import { ServiceRow } from '../components/service-row';
import { IncidentCard } from '../components/incident-card';
import { resolveIncidentCardModel } from '../domain/incident-card';
import { useAcceptService } from '../hooks/use-accept-service';
import { useAllocations } from '../hooks/use-allocations';
import { useOpenService } from '../hooks/use-open-service';
import { useServices } from '../hooks/use-services';
import type { Service } from '../domain/types';

/** Alles behalve "pending" wordt als "active" gezien — een afgeronde service blijft zichtbaar, net als
 * de oude app's `getServiceStatus` wrapper om `getServiceBucket`. */
function screenBucket(service: Service): 'active' | 'pending' {
  return getServiceBucket(service.statuscode) === 'pending' ? 'pending' : 'active';
}

/**
 * De services van één allocatie. Gegroepeerd per fase, services ophalen bij openen.
 */
export function ServicesScreen({
  allocationId,
  preview = false,
  toolbar,
}: {
  allocationId: string;
  preview?: boolean;
  toolbar?: ReactNode;
}) {
  const { t } = useTranslation();
  const { sections: allocationSections, isPending: allocationsPending } = useAllocations();
  const [active, pending] = allocationSections;
  const allocation = [...active.data, ...pending.data].find(
    (item) => item.dn_allocationid === allocationId,
  );

  const incidentId = allocation?.incident.dn_incidentid ?? '';
  const servicesQuery = useServices(incidentId, allocation?.services ?? null);
  const { accept, busyServiceId } = useAcceptService(incidentId);
  const services = servicesQuery.data ?? allocation?.services ?? [];
  const { open, openPreview } = useOpenService({
    allocationId,
    incidentId,
    allocationTypeCode: allocation?.type,
    services,
  });

  const activeServices = services.filter((service) => screenBucket(service) === 'active');
  const pendingServices = services.filter((service) => screenBucket(service) === 'pending');
  const [collapsedKeys, setCollapsedKeys] = useState<Readonly<Record<string, boolean>>>({});

  const listSections = useMemo(
    () => [
      {
        key: 'active',
        title: `${t('allocations.sections.active')}`,
        data: collapsedKeys.active === true ? [] : activeServices,
        count: activeServices.length,
        collapsed: collapsedKeys.active === true,
      },
      {
        key: 'pending',
        title: `${t('allocations.sections.pending')}`,
        data: collapsedKeys.pending === true ? [] : pendingServices,
        count: pendingServices.length,
        collapsed: collapsedKeys.pending === true,
      },
    ],
    [activeServices, pendingServices, collapsedKeys, t],
  );

  if (allocationsPending || !allocation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {toolbar !== undefined ? <View style={styles.toolbar}>{toolbar}</View> : null}
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  const toggleSection = (key: string) => {
    setCollapsedKeys((prev) => ({ ...prev, [key]: prev[key] !== true }));
  };

  const toolbarHeader =
    toolbar !== undefined ? <View style={styles.toolbar}>{toolbar}</View> : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {servicesQuery.isError ? (
        <View style={styles.center}>
          <Text style={styles.message}>{t('common.somethingWrong')}</Text>
          <Button label={t('common.retry')} onPress={() => void servicesQuery.refetch()} />
        </View>
      ) : (
        <SectionList
          sections={listSections}
          keyExtractor={(item, index) => item.dn_serviceid ?? `${index}`}
          renderItem={({ item }) => (
            <ServiceRow
              service={item}
              incident={allocation.incident}
              busy={busyServiceId === item.dn_serviceid}
              readonly={preview}
              onAccept={(service) =>
                void accept(service.dn_serviceid ?? '', { incident: allocation.incident, service })
              }
              onOpen={preview ? (service) => openPreview(service) : (service) => void open(service)}
              onPreview={(service) => openPreview(service)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <CollapsibleSectionHeader
              title={section.title}
              collapsed={section.collapsed}
              count={section.count}
              onPress={() => toggleSection(section.key)}
            />
          )}
          ListHeaderComponent={
            <>
              {toolbarHeader}
              <Text style={styles.title}>{t('services.title')}</Text>
              <IncidentCard model={resolveIncidentCardModel(allocation)} preview={preview} />
            </>
          }
          ListHeaderComponentStyle={styles.incidentHeader}
          renderSectionFooter={() => null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          refreshing={servicesQuery.isRefetching}
          onRefresh={() => void servicesQuery.refetch()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  toolbar: {
    paddingBottom: spacing.xs,
  },
  list: { padding: spacing.md },
  incidentHeader: { marginBottom: spacing.sm },
  separator: { height: spacing.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  message: {
    color: colors.textMuted,
    ...type.body,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  title: {
    ...type.large,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
