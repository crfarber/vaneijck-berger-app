import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { confirm } from '@/shared/ui/confirm';
import { Screen } from '@/shared/ui/screen';
import { colors, spacing, type } from '@/shared/ui/theme';

export function AllocationUnitManagementScreen({
  hasUnit,
  hasActiveWork,
  cancelling,
  onCancel,
}: {
  hasUnit: boolean;
  hasActiveWork: boolean;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const confirmCancellation = async (): Promise<void> => {
    if (!hasUnit || hasActiveWork || cancelling) {
      return;
    }
    const accepted = await confirm({
      title: t('settings.allocationUnitManagement.cancelConfirmTitle'),
      message: t('settings.allocationUnitManagement.cancelConfirmMessage'),
      confirmLabel: t('settings.allocationUnitManagement.cancel'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (accepted) {
      onCancel();
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.title}>{t('settings.allocationUnitManagement.title')}</Text>
        <Text style={styles.hint}>
          {t(
            hasUnit
              ? 'settings.allocationUnitManagement.hint'
              : 'settings.allocationUnitManagement.noUnitHint',
          )}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={t(
            hasUnit
              ? 'settings.allocationUnitManagement.changeVehicle'
              : 'settings.allocationUnitManagement.registerVehicle',
          )}
          onPress={() => router.push('/unit?returnTo=allocation-unit-management')}
        />
        <Button
          label={t('settings.allocationUnitManagement.changeEndDate')}
          variant="secondary"
          disabled={!hasUnit}
          onPress={() => router.push('/unit?mode=extend&returnTo=allocation-unit-management')}
        />
        <Button
          label={t('settings.allocationUnitManagement.cancel')}
          variant="danger"
          disabled={!hasUnit || hasActiveWork}
          loading={cancelling}
          onPress={() => void confirmCancellation()}
        />
      </View>
      {hasActiveWork ? (
        <Text style={styles.warning}>
          {t('settings.allocationUnitManagement.activeWorkMessage')}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  intro: { gap: spacing.xs },
  title: { ...type.large, color: colors.text },
  hint: { ...type.body, color: colors.textMuted },
  actions: { gap: spacing.sm },
  warning: { ...type.body, color: colors.danger },
});
