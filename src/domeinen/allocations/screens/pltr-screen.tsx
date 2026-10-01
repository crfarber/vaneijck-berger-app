import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
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
import { colors, spacing } from '@/shared/ui/theme';
import { IncidentCard } from '../components/incident-card';
import { PltrPhaseCard } from '../components/pltr-phase-card';
import { resolveIncidentCardModel } from '../domain/incident-card';
import { useAcceptService } from '../hooks/use-accept-service';
import { useAllocations } from '../hooks/use-allocations';
import { useOpenService } from '../hooks/use-open-service';
import { useServices } from '../hooks/use-services';

/**
 * One planned transport: the load and the delivery, and a single next step. Ported from
 * `PLTRScreen`. The step opens the same seam as a regular service (accept, the closing screen, or
 * the processing form the team still rebuilds). The old screen only ever used the first service.
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
  const router = useRouter();
  const { sections, isPending: allocationsPending } = useAllocations();
  const [active, pending] = sections;
  const allocation = [...active.data, ...pending.data].find(
    (item) => item.dn_allocationid === allocationId,
  );

  const incidentId = allocation?.incident.dn_incidentid ?? '';
  const servicesQuery = useServices(incidentId, allocation?.services ?? null);
  const { accept, busyServiceId } = useAcceptService(incidentId);
  const services = servicesQuery.data ?? allocation?.services ?? [];
  const { open: openService } = useOpenService({
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
  const showFooter = !preview && (Boolean(service?.dn_serviceid) || action !== null);

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
      {toolbar !== undefined ? <View style={styles.toolbar}>{toolbar}</View> : null}
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
                refreshing={servicesQuery.isRefetching}
                onRefresh={() => void servicesQuery.refetch()}
              />
            }
          >
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
              {service?.dn_serviceid ? (
                <Button
                  label={t('photos.open')}
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/allocations/[id]/services/[serviceId]/photos',
                      params: {
                        id: allocationId,
                        serviceId: service.dn_serviceid ?? '',
                        incidentId,
                        statuscode: String(service.statuscode),
                      },
                    })
                  }
                />
              ) : null}
              {action ? (
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  message: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
