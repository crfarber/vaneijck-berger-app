import { Alert, Linking } from 'react-native';
import { DISPATCH_PHONE_NUMBER, dispatchPhoneUrl } from '../domain/dispatch';

export type NoUnitDispatchAlertTexts = {
  title: string;
  message: string;
  call: string;
  cancel: string;
};

/**
 * Explains that the berger already has an assignment but no unit, and offers to call dispatch.
 * Used from the onboarding gate (blocked / no-unit) and as a fallback when registration returns
 * ACTIVE_INCIDENT.
 */
export function showNoUnitDispatchAlert(texts: NoUnitDispatchAlertTexts): void {
  Alert.alert(texts.title, texts.message, [
    { text: texts.cancel, style: 'cancel' },
    {
      text: texts.call,
      onPress: () => {
        void Linking.openURL(dispatchPhoneUrl());
      },
    },
  ]);
}

/** Builds the alert copy from i18n; phone number comes from the domain constant. */
export function noUnitDispatchAlertTexts(t: {
  (key: 'unit.noUnitDispatch.title'): string;
  (key: 'unit.noUnitDispatch.message', options: { phone: string }): string;
  (key: 'unit.noUnitDispatch.call'): string;
  (key: 'common.cancel'): string;
}): NoUnitDispatchAlertTexts {
  return {
    title: t('unit.noUnitDispatch.title'),
    message: t('unit.noUnitDispatch.message', { phone: DISPATCH_PHONE_NUMBER }),
    call: t('unit.noUnitDispatch.call'),
    cancel: t('common.cancel'),
  };
}
