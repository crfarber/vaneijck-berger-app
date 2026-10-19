import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import type { Coordinate } from '@/domeinen/location';
import { externalMapLinks } from '@/domeinen/services';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { spacing } from '@/shared/ui/theme';

/**
 * Choose a maps app for a coordinate. Apple Maps only on iOS (same as the old `MapModal`);
 * Google Maps and Waze on both platforms.
 */
export function NavigateMapsSheet({
  coordinate,
  onClose,
}: {
  coordinate: Coordinate | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const links = coordinate ? externalMapLinks(coordinate) : null;
  const showApple = Platform.OS === 'ios';

  const open = (url: string): void => {
    onClose();
    void Linking.openURL(url).catch(() => {
      Alert.alert(t('common.somethingWrong'));
    });
  };

  return (
    <BottomSheet
      visible={coordinate !== null}
      title={t('pltr.navigate')}
      closeLabel={t('common.cancel')}
      onClose={onClose}
      fitContent
      footer={
        links ? (
          <View style={styles.actions}>
            {showApple ? (
              <Button label={t('pltr.maps.apple')} onPress={() => open(links.apple)} />
            ) : null}
            <Button
              label={t('pltr.maps.google')}
              variant={showApple ? 'secondary' : 'primary'}
              onPress={() => open(links.google)}
            />
            <Button
              label={t('pltr.maps.waze')}
              variant="secondary"
              onPress={() => open(links.waze)}
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
});
