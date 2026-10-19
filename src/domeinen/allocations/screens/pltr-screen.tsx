import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildPltrCards,
  externalMapLinks,
  pltrPrimaryAction,
  type PltrAction,
  type PltrCard,
} from '@/domeinen/services';
import { Button } from '@/shared/ui/button';
import { ScreenFooter } from '@/shared/ui/screen-footer';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { colors, spacing, type } from '@/shared/ui/theme';
import { IncidentCard } from '../components/incident-card';
import { PltrPhaseCard } from '../components/pltr-phase-card';
import { resolveIncidentCardModel } from '../domain/incident-card';
import { useAcceptService } from '../hooks/use-accept-service';
import { useAllocations } from '../hooks/use-allocations';
import { useOpenService } from '../hooks/use-open-service';
import { showServicesRefresh, useServices } from '../hooks/use-services';

/**
 * One planned transport: the load and the delivery, and a single next step. Ported from
 * `PLTRScreen`. The step opens the same seam as a regular service (accept, the closing screen, or
 * the processing form). Opened with `preview` (list swipe Voorbeeld) the footer only offers a
 * read-only form open via `openPreview`. The old screen only ever used the first service.
 */
export function PltrScreen({
  allocationId,
  preview = false,
  toolbar,
}: {
  allocationId: string;
  preview?: boolean;
  toolbar?: ReactNode;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusOverlay = useStatusOverlay();
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const { sections, isPending: allocationsPending } = useAllocations();
  const [active, pending] = sections;
  const allocation = [...active.data, ...pending.data].find(
    (item) => item.dn_allocationid === allocationId,
  );

  const incidentId = allocation?.incident.dn_incidentid ?? '';
  const servicesQuery = useServices(incidentId, allocation?.services ?? null);
  useEffect(() => {
    if (allocation && servicesQuery.isFetching && !manualRefreshing) {
      void showServicesRefresh(
        queryClient,
        incidentId,
        statusOverlay,
        t('feedback.processing.openService'),
      );
    }
  }, [
    allocation,
    servicesQuery.isFetching,
    manualRefreshing,
    queryClient,
    incidentId,
    statusOverlay,
    t,
  ]);

  const refreshManually = async () => {
    setManualRefreshing(true);
    try {
      await servicesQuery.refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const { accept, busyServiceId } = useAcceptService(incidentId);
  const services = servicesQuery.data ?? allocation?.services ?? [];
  const { open: openService, openPreview } = useOpenService({
    allocationId,
    incidentId,
    allocationTypeCode: allocation?.type,
    services,
  });

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

  const service = services[0];
  const cards = buildPltrCards({ service, incident: allocation.incident });
  const action = service ? pltrPrimaryAction(service.statuscode) : null;
  /** Preview (list swipe) keeps a footer to open the form read-only; work actions stay hidden. */
  const showFooter = preview
    ? Boolean(service?.dn_serviceid)
    : action !== null || Boolean(service?.dn_serviceid);

  const openMaps = (card: PltrCard): void => {
    if (!card.coordinate) {
      return;
    }
    const links = externalMapLinks(card.coordinate);
    const open = (url: string): void => {
      void Linking.openURL(url).catch(() => {
        Alert.alert(t('common.somethingWrong'));
      });
    };
    Alert.alert(t('pltr.navigate'), undefined, [
      { text: t('pltr.maps.apple'), onPress: () => open(links.apple) },
      { text: t('pltr.maps.google'), onPress: () => open(links.google) },
      { text: t('pltr.maps.waze'), onPress: () => open(links.waze) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const call = (card: PltrCard): void => {
    if (!card.phone) {
      return;
    }
    void Linking.openURL(`tel:${card.phone}`).catch(() => {
      Alert.alert(t('common.somethingWrong'));
    });
  };

  const onPrimary = (): void => {
    if (!service || !action) {
      return;
    }
    if (action === 'accept') {
      const serviceId = service.dn_serviceid;
      if (!serviceId) {
        return;
      }
      void accept(serviceId, { incident: allocation.incident, service });
      return;
    }
    void openService(service);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={showFooter ? [] : ['bottom']}>
      {servicesQuery.isError ? (
        <View style={styles.center}>
          <Text style={styles.message}>{t('common.somethingWrong')}</Text>
          <Button label={t('common.retry')} onPress={() => void servicesQuery.refetch()} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={manualRefreshing}
                onRefresh={() => void refreshManually()}
              />
            }
          >
            {toolbar !== undefined ? <View style={styles.toolbar}>{toolbar}</View> : null}
            <Text style={styles.title}>{t('pltr.title')}</Text>
            <IncidentCard
              model={resolveIncidentCardModel(allocation)}
              preview={preview}
              showVehicle
            />
            {cards.length === 0 ? (
              <Text style={styles.message}>{t('pltr.noAddress')}</Text>
            ) : (
              cards.map((card) => (
                <PltrPhaseCard
                  key={card.phase}
                  card={card}
                  preview={preview}
                  onNavigate={() => openMaps(card)}
                  onCall={() => call(card)}
                />
              ))
            )}
          </ScrollView>
          {showFooter ? (
            <ScreenFooter>
              {preview && service?.dn_serviceid ? (
                <Button
                  label={t('pltr.viewServicePreview')}
                  variant="action"
                  onPress={() => openPreview(service)}
                />
              ) : action ? (
                <Button
                  label={actionLabel(t, action)}
                  onPress={onPrimary}
                  loading={action === 'accept' && busyServiceId === service?.dn_serviceid}
                />
              ) : null}
            </ScreenFooter>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

function actionLabel(t: (key: ActionLabelKey) => string, action: PltrAction): string {
  switch (action) {
    case 'accept':
      return t('pltr.acceptService');
    case 'start-load':
      return t('pltr.startLoad');
    case 'start-delivery':
      return t('pltr.startDelivery');
    case 'finish':
      return t('services.finish.submit');
    case 'completed':
      return t('pltr.completed');
  }
}

type ActionLabelKey =
  | 'pltr.acceptService'
  | 'pltr.startLoad'
  | 'pltr.startDelivery'
  | 'services.finish.submit'
  | 'pltr.completed';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  toolbar: {
    paddingBottom: spacing.xs,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  title: {
    ...type.large,
    color: colors.text,
    marginBottom: spacing.sm,
  },
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
});
