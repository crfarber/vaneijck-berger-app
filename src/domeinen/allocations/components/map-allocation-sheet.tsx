import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { usePendingMutations } from '@/domeinen/outbox/ui';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { spacing } from '@/shared/ui/theme';
import { resolveIncidentCardModel, type IncidentCardModel } from '../domain/incident-card';
import type { AllocationListBucket } from '../domain/status';
import type { Allocation } from '../domain/types';
import { IncidentCard } from './incident-card';

type MapAllocationSheetProps = {
  allocation: Allocation | null;
  bucket: AllocationListBucket | null;
  onClose: () => void;
  onPreview: (allocationId: string) => void;
  onAccept: (allocation: Allocation) => void;
  onOpen: (allocationId: string) => void;
};

/**
 * Same card face as the allocations list. On the map, call/navigate are offered whenever phone
 * or coordinates exist (also for pending) — the list only shows those after accept.
 */
function withMapSheetActions(model: IncidentCardModel): IncidentCardModel {
  const hasPhone = model.phone !== undefined && model.phone !== '';
  const hasCoordinate = model.coordinate !== undefined;
  return {
    ...model,
    showCall: hasPhone,
    showNavigate: hasCoordinate,
  };
}

/**
 * Marker tap sheet: list IncidentCard (scrollable so address/actions are not clipped), plus
 * accept/preview or open in the footer.
 */
export function MapAllocationSheet({
  allocation,
  bucket,
  onClose,
  onPreview,
  onAccept,
  onOpen,
}: MapAllocationSheetProps) {
  const { t } = useTranslation();
  const pending = usePendingMutations();
  const visible = allocation !== null && bucket !== null && bucket !== 'hidden';
  const model = useMemo(
    () => (allocation === null ? null : withMapSheetActions(resolveIncidentCardModel(allocation))),
    [allocation],
  );

  const footer =
    allocation === null || bucket === null || bucket === 'hidden' ? null : (
      <View style={styles.footer}>
        {bucket === 'pending' ? (
          <>
            <Button
              label={t('allocations.actions.accept')}
              onPress={() => {
                onClose();
                onAccept(allocation);
              }}
            />
            <Button
              label={t('allocations.actions.preview')}
              variant="secondary"
              onPress={() => {
                onClose();
                onPreview(allocation.dn_allocationid);
              }}
            />
          </>
        ) : (
          <Button
            label={t('allocations.map.openAssignment')}
            onPress={() => {
              onClose();
              onOpen(allocation.dn_allocationid);
            }}
          />
        )}
      </View>
    );

  return (
    <BottomSheet
      visible={visible}
      title={t('allocations.map.markerTitle')}
      closeLabel={t('common.close')}
      onClose={onClose}
      fitContent
      maxHeight="85%"
      footer={footer}
    >
      {model !== null && allocation !== null ? (
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.body}
        >
          <IncidentCard
            model={model}
            pendingConnection={pending.allocationIds.has(allocation.dn_allocationid)}
          />
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { paddingVertical: spacing.sm },
  footer: { gap: spacing.sm },
});
