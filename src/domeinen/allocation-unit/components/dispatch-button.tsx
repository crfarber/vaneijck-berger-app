import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { ToolbarButton } from '@/shared/ui/toolbar-button';
import { colors } from '@/shared/ui/theme';
import { dispatchPhoneUrl } from '../domain/dispatch';
import PhoneIcon from '@/shared/ui/icons/phone';

/**
 * Dials the fixed dispatch number in one tap. App-issue reporting lives under Settings → support.
 */
export function DispatchButton() {
  const { t } = useTranslation();

  return (
    <ToolbarButton
      accessibilityLabel={t('toolbar.dispatch')}
      onPress={() => {
        void Linking.openURL(dispatchPhoneUrl());
      }}
    >
      <PhoneIcon size={24} color={colors.background} />
    </ToolbarButton>
  );
}
