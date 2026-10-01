import { Alert, Linking } from 'react-native';
import { DISPATCH_PHONE_NUMBER, dispatchPhoneUrl } from '@/domeinen/allocation-unit';
import { claimNoValidUnitContinueNotice } from '../domain/no-valid-unit-continue-notice';

export type NoValidUnitContinueAlertTexts = {
  title: string;
  message: string;
  continueLabel: string;
  call: string;
};

/**
 * Explains that the berger has no valid unit but may finish the assignment on their name first.
 * Used from the onboarding gate (blocked / expired-with-active / ACTIVE_INCIDENT escape).
 * Deduplicated so remounts do not stack a second native alert.
 */
export function showNoValidUnitContinueAlert(texts: NoValidUnitContinueAlertTexts): void {
  if (!claimNoValidUnitContinueNotice()) {
    return;
  }
  Alert.alert(texts.title, texts.message, [
    { text: texts.continueLabel },
    {
      text: texts.call,
      onPress: () => {
        void Linking.openURL(dispatchPhoneUrl());
      },
    },
  ]);
}

/** Builds the alert copy from i18n; phone number comes from the domain constant. */
export function noValidUnitContinueAlertTexts(t: {
  (key: 'onboarding.noValidUnit.title'): string;
  (key: 'onboarding.noValidUnit.message'): string;
  (key: 'onboarding.noValidUnit.continue'): string;
  (key: 'onboarding.noValidUnit.callDispatch', options: { phone: string }): string;
}): NoValidUnitContinueAlertTexts {
  return {
    title: t('onboarding.noValidUnit.title'),
    message: t('onboarding.noValidUnit.message'),
    continueLabel: t('onboarding.noValidUnit.continue'),
    call: t('onboarding.noValidUnit.callDispatch', { phone: DISPATCH_PHONE_NUMBER }),
  };
}
