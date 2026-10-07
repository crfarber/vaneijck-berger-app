import { Alert } from 'react-native';
import { claimRegisterUnitNotice } from '../domain/register-unit-notice';

export type RegisterUnitAlertTexts = {
  title: string;
  message: string;
  cancel: string;
  confirm: string;
};

export function showRegisterUnitAlert(texts: RegisterUnitAlertTexts, onConfirm: () => void): void {
  if (!claimRegisterUnitNotice()) {
    return;
  }
  Alert.alert(texts.title, texts.message, [
    { text: texts.cancel, style: 'cancel' },
    { text: texts.confirm, onPress: onConfirm },
  ]);
}

export function registerUnitAlertTexts(t: {
  (key: 'onboarding.registerUnit.title'): string;
  (key: 'onboarding.registerUnit.message'): string;
  (key: 'onboarding.registerUnit.cancel'): string;
  (key: 'onboarding.registerUnit.confirm'): string;
}): RegisterUnitAlertTexts {
  return {
    title: t('onboarding.registerUnit.title'),
    message: t('onboarding.registerUnit.message'),
    cancel: t('onboarding.registerUnit.cancel'),
    confirm: t('onboarding.registerUnit.confirm'),
  };
}
