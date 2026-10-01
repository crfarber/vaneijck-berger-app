import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { usePendingMutations } from '@/domeinen/outbox/ui';
import { canForwardAllocations } from '@/domeinen/worker';
import { useWorker } from '@/domeinen/worker/ui';
import { isAllocationFinished } from '../domain/finished';
import type { AllocationListBucket } from '../domain/status';
import { resolveIncidentCardModel } from '../domain/incident-card';
import type { Allocation } from '../domain/types';
import { AllocationActions } from './allocation-actions';
import { AllocationDeclineSheet } from './allocation-decline-sheet';
import { AllocationReassignSheet } from './allocation-reassign-sheet';
import { IncidentCard } from './incident-card';

/**
 * One allocation on the list. Card face: incident info, plus forward on a pending card when the
 * berger may hand it over (legacy `ForwardButton`). Accept/decline/finish stay under the card and
 * appear on a left swipe. Decline and forward each open a sheet over the list; both live outside
 * the swipeable so closing the swipe does not unmount them.
 */
export function AllocationRow({
  allocation,
  bucket,
  hasActiveAllocations,
}: {
  allocation: Allocation;
  bucket: AllocationListBucket;
  hasActiveAllocations: boolean;
}) {
  const router = useRouter();
  const model = resolveIncidentCardModel(allocation);
  const { data: worker } = useWorker();
  const pending = usePendingMutations();
  const showForward = bucket === 'pending' && canForwardAllocations(worker ?? null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  return (
    <>
      <ReanimatedSwipeable
        friction={2}
        rightThreshold={0}
        overshootRight={false}
        enableTrackpadTwoFingerGesture
        renderRightActions={(_progress, _translation, swipeableMethods) => (
          <View style={styles.actions}>
            <AllocationActions
              allocation={allocation}
              bucket={bucket}
              hasActiveAllocations={hasActiveAllocations}
              onAction={() => swipeableMethods.close()}
              onDecline={() => setDeclineOpen(true)}
              onPreview={
                bucket === 'pending'
                  ? () =>
                      router.push({
                        pathname: '/allocations/[id]',
                        params: { id: allocation.dn_allocationid, mode: 'readonly' },
                      })
                  : undefined
              }
            />
          </View>
        )}
      >
        <IncidentCard
          model={model}
          swipeable
          showForward={showForward}
          onForward={showForward ? () => setReassignOpen(true) : undefined}
          pendingConnection={pending.allocationIds.has(allocation.dn_allocationid)}
          onPress={
            bucket === 'active'
              ? () =>
                  router.push({
                    pathname: '/allocations/[id]',
                    params: { id: allocation.dn_allocationid },
                  })
              : undefined
          }
        />
      </ReanimatedSwipeable>
      <AllocationDeclineSheet
        allocationId={allocation.dn_allocationid}
        // "Done" only when the card has no finish button yet (legacy `showDoneOption`).
        allowDone={!isAllocationFinished(allocation)}
        visible={declineOpen}
        onClose={() => setDeclineOpen(false)}
      />
      <AllocationReassignSheet
        incidentId={allocation.incident.dn_incidentid}
        visible={reassignOpen}
        onClose={() => setReassignOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    height: '100%',
  },
});
