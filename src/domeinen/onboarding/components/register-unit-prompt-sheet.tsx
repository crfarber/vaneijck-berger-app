import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CurrentAllocationUnitCard } from '@/domeinen/allocation-unit/ui';
import type { LastUnitSnapshot } from '@/domeinen/allocation-unit';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { spacing } from '@/shared/ui/theme';

export function RegisterUnitPromptSheet({
  visible,
  snapshot,
  onUseThis,
  onChooseOther,
  onDismiss,
}: {
  visible: boolean;
  snapshot: LastUnitSnapshot;
  onUseThis: () => void;
  onChooseOther: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const vehicle =
    snapshot.kind === 'external'
      ? { vehicleName: snapshot.plate, vehicleNumber: null }
      : {
          vehicleName: snapshot.vehicleName,
          vehicleNumber: snapshot.vehicleNumber,
        };
  const trailer =
    snapshot.kind === 'internal' && snapshot.trailerName !== null
      ? {
          vehicleName: snapshot.trailerName,
          vehicleNumber: snapshot.trailerNumber,
        }
      : undefined;

  return (
    <BottomSheet
      visible={visible}
      title={t('onboarding.registerUnit.title')}
      closeLabel={t('onboarding.registerUnit.cancel')}
      onClose={onDismiss}
      fitContent
      footer={
        <View style={styles.footer}>
          <Button
            label={t('onboarding.registerUnit.chooseOther')}
            variant="secondary"
            onPress={onChooseOther}
          />
        </View>
      }
    >
      <CurrentAllocationUnitCard
        mode="reuse"
        vehicle={vehicle}
        trailer={trailer}
        isActive={false}
        activeUntil={null}
        restrictions={[]}
        onUseLastVehicle={onUseThis}
        statusLabel={t('onboarding.registerUnit.lastUsed')}
        actionLabel={t('onboarding.registerUnit.useThis')}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.sm,
  },
});
