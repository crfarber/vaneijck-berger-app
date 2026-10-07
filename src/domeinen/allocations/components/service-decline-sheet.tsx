import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { colors, spacing } from '@/shared/ui/theme';
import {
  SERVICE_DECLINE_ACTION,
  type ServiceDeclineAction,
  type ServiceDeclineStep,
} from '../domain/service-decline';

/** Choose → confirm → submit. Selecting an option never declines; confirm does. */
export function ServiceDeclineSheet({
  state,
  canReturnToDispatch,
  onClose,
  onSelect,
  onBack,
  onConfirm,
}: {
  state: ServiceDeclineStep;
  canReturnToDispatch: boolean;
  onClose: () => void;
  onSelect: (action: ServiceDeclineAction) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const visible = state.step !== 'closed';
  const submitting = state.step === 'submitting';

  const title =
    state.step === 'confirm' || state.step === 'submitting'
      ? t('services.decline.confirmTitle')
      : t('services.decline.title');

  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={t('common.cancel')}
      onClose={onClose}
      height="45%"
      footer={
        state.step === 'choose' ? (
          <View style={styles.actions}>
            <Button
              label={t('services.decline.futileRide')}
              onPress={() => onSelect(SERVICE_DECLINE_ACTION.futileRide)}
            />
            {canReturnToDispatch ? (
              <Button
                label={t('services.decline.returnToDispatch')}
                variant="secondary"
                onPress={() => onSelect(SERVICE_DECLINE_ACTION.returnToDispatch)}
              />
            ) : null}
          </View>
        ) : state.step === 'confirm' || state.step === 'submitting' ? (
          <View style={styles.actions}>
            <Text style={styles.confirmMessage}>
              {state.action === SERVICE_DECLINE_ACTION.futileRide
                ? t('services.decline.confirmFutileRide')
                : t('services.decline.confirmReturnToDispatch')}
            </Text>
            <Button
              label={t('services.decline.confirm')}
              variant="danger"
              loading={submitting}
              onPress={onConfirm}
            />
            <Button
              label={t('common.back')}
              variant="secondary"
              disabled={submitting}
              onPress={onBack}
            />
          </View>
        ) : null
      }
    >
      <View />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  confirmMessage: {
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
