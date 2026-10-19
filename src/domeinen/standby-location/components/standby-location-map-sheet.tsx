import { useTranslation } from 'react-i18next';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { externalMapLinks } from '@/domeinen/services';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { colors, spacing, type } from '@/shared/ui/theme';
import { formatStandbyAddressShort } from '../domain/address';
import type { StandbyLocationAdvice } from '../domain/types';

type StandbyLocationMapSheetProps = {
  advice: StandbyLocationAdvice | null;
  onClose: () => void;
};

export function StandbyLocationMapSheet({ advice, onClose }: StandbyLocationMapSheetProps) {
  const { t } = useTranslation();
  const visible = advice !== null;
  const showApple = Platform.OS === 'ios';
  const links =
    advice === null
      ? null
      : externalMapLinks({ latitude: advice.latitude, longitude: advice.longitude });
  const address = advice === null ? '' : formatStandbyAddressShort(advice);

  return (
    <BottomSheet
      visible={visible}
      title={t('standbyLocation.mapTitle')}
      closeLabel={t('common.close')}
      onClose={onClose}
      footer={
        links === null ? null : (
          <View style={styles.footer}>
            {showApple ? (
              <Button
                label={t('standbyLocation.openAppleMaps')}
                onPress={() => void Linking.openURL(links.apple).catch(() => undefined)}
              />
            ) : null}
            <Button
              label={t('standbyLocation.openGoogleMaps')}
              onPress={() => void Linking.openURL(links.google).catch(() => undefined)}
              variant={showApple ? 'secondary' : 'primary'}
            />
            <Button
              label={t('standbyLocation.openWaze')}
              onPress={() => void Linking.openURL(links.waze).catch(() => undefined)}
              variant="secondary"
            />
          </View>
        )
      }
    >
      {advice !== null ? (
        <View style={styles.body}>
          {address !== '' ? <Text style={styles.address}>{address}</Text> : null}
          <Text style={styles.coords}>
            {advice.latitude.toFixed(5)}, {advice.longitude.toFixed(5)}
          </Text>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
  address: { ...type.body, color: colors.text, fontWeight: '700' },
  coords: { ...type.label, color: colors.textMuted },
  footer: { gap: spacing.sm },
});
