import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';
import { useAllocationActions } from '../hooks/use-allocation-actions';
import type { AllocationListBucket } from '../domain/status';
import type { Allocation } from '../domain/types';
import { SwipePanel } from './swipe-panel';
import CheckIcon from '@/shared/ui/icons/check';
import CloseIcon from '@/shared/ui/icons/close';
import EyeIcon from '@/shared/ui/icons/eye';

/**
 * Full-height swipe panels under a card (legacy `SwipeButton` layout). Pending: accept, preview,
 * decline. Forward lives on the card face. Active: decline, plus finish when nothing is left.
 */
export function AllocationActions({
  allocation,
  bucket,
  hasActiveAllocations,
  onAction,
  onPreview,
  onDecline,
}: {
  allocation: Allocation;
  bucket: AllocationListBucket;
  hasActiveAllocations: boolean;
  onAction?: () => void;
  /** Opens the services or PLTR screen read-only, same as the old `handlePreviewAllocation`. */
  onPreview?: () => void;
  /** Opens the decline reasons (`AllocationDeclineSheet`). */
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const { accept, finish, busy, isFinished } = useAllocationActions(
    allocation,
    hasActiveAllocations,
  );

  const run = (action: () => void): void => {
    onAction?.();
    action();
  };

  return (
    <View style={styles.row}>
      {bucket === 'pending' ? (
        <SwipePanel
          label={t('allocations.actions.accept')}
          backgroundColor={colors.success}
          icon={<CheckIcon size={32} color={colors.background} />}
          onPress={() => run(() => void accept())}
          loading={busy === 'accept'}
        />
      ) : null}
      {bucket === 'pending' && onPreview ? (
        <SwipePanel
          label={t('allocations.actions.preview')}
          backgroundColor={colors.brandAction}
          icon={<EyeIcon size={36} color={colors.background} />}
          onPress={() => run(onPreview)}
          disabled={busy !== null}
        />
      ) : null}
      <SwipePanel
        label={t('allocations.actions.decline')}
        backgroundColor={colors.danger}
        icon={<CloseIcon size={32} color={colors.background} />}
        onPress={() => run(onDecline)}
        disabled={busy !== null}
      />
      {bucket === 'active' && isFinished ? (
        <SwipePanel
          label={t('allocations.actions.finish')}
          backgroundColor={colors.brandDark}
          icon={<CheckIcon size={32} color={colors.background} />}
          onPress={() => run(() => void finish())}
          loading={busy === 'finish'}
        />
      ) : null}
    </View>
  );
}

/** Swipe panel left of the card: opens the overview map zoomed in on this assignment. */
export function AllocationMapActions({ onShowOnMap }: { onShowOnMap: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <SwipePanel
        label={t('allocations.actions.showOnMap')}
        backgroundColor={colors.brandAction}
        icon={<Ionicons name="map-outline" size={32} color={colors.background} />}
        onPress={onShowOnMap}
        style={styles.leftPanel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
  },
  leftPanel: { marginLeft: 0, marginRight: spacing.sm },
});
