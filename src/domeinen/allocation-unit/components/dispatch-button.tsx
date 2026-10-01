import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { colors, spacing } from '@/shared/ui/theme';
import { dispatchPhoneUrl } from '../domain/dispatch';
import PhoneIcon from '@/shared/ui/icons/phone';

/**
 * Opens a sheet to call the fixed dispatch number. Internal bergers also get a shortcut to the
 * support log (the old "report app issue" path).
 */
export function DispatchButton({ canReportIssue }: { canReportIssue: boolean }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <ToolbarButton accessibilityLabel={t('toolbar.dispatch')} onPress={() => setVisible(true)}>
        <PhoneIcon size={24} color={colors.background} />
      </ToolbarButton>
      <BottomSheet
        visible={visible}
        title={t('unit.callDispatch.title')}
        closeLabel={t('common.cancel')}
        onClose={() => setVisible(false)}
        height="40%"
        footer={
          <View style={styles.footer}>
            <Button
              label={t('unit.callDispatch.call')}
              onPress={() => {
                setVisible(false);
                void Linking.openURL(dispatchPhoneUrl());
              }}
            />
            {canReportIssue ? (
              <Button
                label={t('unit.callDispatch.reportIssue')}
                variant="secondary"
                onPress={() => {
                  setVisible(false);
                  router.push('/support');
                }}
              />
            ) : null}
          </View>
        }
      >
        <View />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.sm },
});
