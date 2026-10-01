import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { usePendingMutations } from '@/domeinen/outbox/ui';
import { getServiceBucket } from '@/domeinen/services';
import { colors, spacing } from '@/shared/ui/theme';
import { resolveServiceCardModel } from '../domain/service-card';
import type { Incident, Service } from '../domain/types';
import { ServiceCard } from './service-card';
import { SwipePanel } from './swipe-panel';
import CheckIcon from '@/shared/ui/icons/check';
import EyeIcon from '@/shared/ui/icons/eye';

/**
 * One service on an incident. Pending services swipe for accept (when not previewing the
 * allocation) and preview of the form — same as old `PendingServiceListItem`. An active service is
 * tappable when `onOpen` is given.
 */
export function ServiceRow({
  service,
  incident,
  onAccept,
  onOpen,
  onPreview,
  busy,
  readonly,
}: {
  service: Service;
  incident?: Incident;
  onAccept: (service: Service) => void;
  onOpen?: (service: Service) => void;
  onPreview?: (service: Service) => void;
  busy: boolean;
  /** Allocation list preview: hide accept; preview of the form still opens. */
  readonly?: boolean;
}) {
  const { t } = useTranslation();
  const pending = usePendingMutations();
  const isPending = getServiceBucket(service.statuscode) === 'pending';
  const model = resolveServiceCardModel(service, incident);
  const pendingConnection =
    service.dn_serviceid !== undefined && pending.serviceIds.has(service.dn_serviceid);

  const card = (
    <ServiceCard
      model={model}
      showNavigate={!readonly && !isPending}
      pendingConnection={pendingConnection}
      onPress={!isPending && onOpen ? () => onOpen(service) : undefined}
    />
  );

  if (!isPending || !onPreview) {
    return card;
  }

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={0}
      overshootRight={false}
      enableTrackpadTwoFingerGesture
      renderRightActions={(_progress, _translation, swipeableMethods) => (
        <View style={styles.swipeActions}>
          {!readonly ? (
            <SwipePanel
              label={t('allocations.actions.accept')}
              backgroundColor={colors.success}
              icon={<CheckIcon size={32} color={colors.background} />}
              onPress={() => {
                swipeableMethods.close();
                onAccept(service);
              }}
              loading={busy}
            />
          ) : null}
          <SwipePanel
            label={t('allocations.actions.preview')}
            backgroundColor={colors.brandAction}
            icon={<EyeIcon size={32} color={colors.background} />}
            onPress={() => {
              swipeableMethods.close();
              onPreview(service);
            }}
            disabled={busy}
          />
        </View>
      )}
    >
      {card}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
  },
});
