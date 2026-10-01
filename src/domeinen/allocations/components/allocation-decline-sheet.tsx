import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertBanner } from '@/shared/ui/alert-banner';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { useDeclineAllocation } from '../hooks/use-decline-allocation';

/** The old `AllocationDeclineScreen`'s reasons, in a sheet over the list. Mounted only while open,
 * so every open starts without a selection and loads the reasons fresh. */
export function AllocationDeclineSheet({
  allocationId,
  allowDone,
  visible,
  onClose,
}: {
  allocationId: string;
  allowDone: boolean;
  visible: boolean;
  onClose: () => void;
}) {
  return visible ? (
    <DeclineSheetContent allocationId={allocationId} allowDone={allowDone} onClose={onClose} />
  ) : null;
}

function DeclineSheetContent({
  allocationId,
  allowDone,
  onClose,
}: {
  allocationId: string;
  allowDone: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { reasons, selected, setSelected, busy, message, canDecline, submit } =
    useDeclineAllocation(allocationId, allowDone, { onSubmitting: onClose });

  return (
    <BottomSheet
      visible
      title={t('allocations.decline.title')}
      closeLabel={t('common.cancel')}
      onClose={onClose}
      footer={
        <>
          {message ? <AlertBanner message={message} /> : null}
          <Button
            label={t('allocations.decline.submit')}
            variant="danger"
            onPress={() => void submit()}
            loading={busy}
            disabled={!canDecline}
          />
        </>
      }
    >
      <View style={styles.body}>
        {!canDecline ? (
          <AlertBanner tone="warning" message={t('allocations.decline.errors.activeServices')} />
        ) : null}
        {reasons === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {reasons.map((reason) => {
              const isSelected = selected === reason.value;
              return (
                <Pressable
                  key={reason.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(reason.value)}
                  style={[styles.reason, isSelected && styles.reasonSelected]}
                >
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {reason.text}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: spacing.sm },
  loading: { padding: spacing.lg, alignItems: 'center' },
  list: { gap: spacing.sm },
  reason: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.brandLight,
  },
  reasonSelected: { backgroundColor: colors.brandDark },
  reasonText: { color: colors.text, fontSize: 15 },
  reasonTextSelected: { color: colors.brandLight, fontWeight: '600' },
});
