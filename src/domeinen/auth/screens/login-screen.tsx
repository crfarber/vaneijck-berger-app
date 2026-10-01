import { useState } from 'react';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import loginSplash from '@/assets/images/login-splash.png';
import { Button } from '@/shared/ui/button';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { ExternalLoginChrome } from '../components/external-login-chrome';
import {
  describeInternalFailure,
  describeLoginFailure,
  describeSmsFailure,
} from '../domain/login-failures';
import {
  applyPhoneInput,
  DEFAULT_COUNTRY_CODE,
  isPlausiblePhoneNumber,
  languageForCountryCode,
  normalizePhoneNumber,
} from '../domain/phone-number';
import { useAuthService, useSession } from '../hooks/auth-context';
import { ExternalCodeScreen, SMS_CODE_LENGTH } from './external-code-screen';
import { ExternalPhoneScreen } from './external-phone-screen';

const appVersion = Constants.expoConfig?.version;

export function LoginScreen() {
  const { t, i18n } = useTranslation();
  const authService = useAuthService();
  const sessionExpired = useSession((state) => state.signedOutReason === 'expired');
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<'choice' | 'phone' | 'code'>('choice');
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const applyCountry = (dialCode: string): void => {
    setCountryCode(dialCode);
    void i18n.changeLanguage(languageForCountryCode(dialCode));
  };

  const changeCountryCode = (dialCode: string): void => {
    const applied = applyPhoneInput(dialCode, phone);
    applyCountry(applied.countryCode);
    setPhone(applied.nationalNumber);
  };

  const changePhone = (value: string): void => {
    const applied = applyPhoneInput(countryCode, value);
    if (applied.countryCode !== countryCode) {
      applyCountry(applied.countryCode);
    }
    setPhone(applied.nationalNumber);
  };

  const requestCode = async () => {
    const applied = applyPhoneInput(countryCode, phone);
    if (applied.countryCode !== countryCode) {
      applyCountry(applied.countryCode);
    }
    if (applied.nationalNumber !== phone) {
      setPhone(applied.nationalNumber);
    }
    if (!isPlausiblePhoneNumber(applied.countryCode, applied.nationalNumber)) {
      setMessage(t('login.errors.invalidPhone'));
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await authService.requestSmsCode(
      normalizePhoneNumber(applied.countryCode, applied.nationalNumber),
    );
    setBusy(false);

    if (result.ok) {
      setStep('code');
      return;
    }
    const { key, detail } = describeSmsFailure(result.error);
    setMessage(detail ?? t(key));
    if (result.error.kind === 'code-still-valid') {
      setStep('code'); // a valid code exists: let the user enter it
    }
  };

  const changeCode = (value: string): void => {
    setCode(value.replace(/\D/g, '').slice(0, SMS_CODE_LENGTH));
  };

  const signIn = async () => {
    setBusy(true);
    setMessage(null);
    const result = await authService.signInWithSmsCode(
      normalizePhoneNumber(countryCode, phone),
      code.trim(),
    );
    setBusy(false);
    if (!result.ok) {
      const { key, detail } = describeLoginFailure(result.error);
      setMessage(detail ?? t(key));
    }
    // On success the session changes and the navigation moves on by itself.
  };

  const resendCode = async (): Promise<boolean> => {
    setBusy(true);
    setMessage(null);
    const result = await authService.requestSmsCode(normalizePhoneNumber(countryCode, phone));
    setBusy(false);
    if (result.ok) {
      return true;
    }
    if (result.error.kind === 'code-still-valid') {
      return false;
    }
    const { key, detail } = describeSmsFailure(result.error);
    setMessage(detail ?? t(key));
    return false;
  };

  const signInInternal = async () => {
    setBusy(true);
    setMessage(null);
    const result = await authService.signInInternal();
    setBusy(false);
    if (!result.ok) {
      const key = describeInternalFailure(result.error);
      setMessage(key === null ? null : t(key));
    }
  };

  if (step === 'choice') {
    return (
      <ImageBackground source={loginSplash} style={styles.splash} resizeMode="cover">
        <View style={[styles.choice, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {sessionExpired ? (
            <View style={styles.noticeBox}>
              <Text style={styles.choiceNotice}>{t('login.sessionExpired')}</Text>
            </View>
          ) : null}
          {message ? (
            <View style={styles.noticeBox}>
              <Text accessibilityRole="alert" style={styles.choiceError}>
                {message}
              </Text>
            </View>
          ) : null}
          <Button
            label={t('login.internal')}
            variant="light"
            onPress={signInInternal}
            loading={busy}
          />
          <Button
            label={t('login.external')}
            variant="light"
            onPress={() => {
              setMessage(null);
              setStep('phone');
            }}
            disabled={busy}
          />
          {appVersion ? (
            <Text style={styles.version}>{t('login.version', { version: appVersion })}</Text>
          ) : null}
        </View>
      </ImageBackground>
    );
  }

  const phoneNumber = normalizePhoneNumber(countryCode, phone);

  if (step === 'phone') {
    return (
      <ExternalLoginChrome
        title={t('login.external')}
        onBack={() => {
          setStep('choice');
          setMessage(null);
        }}
        backDisabled={busy}
        footer={<Button label={t('login.requestCode')} onPress={requestCode} loading={busy} />}
      >
        <ExternalPhoneScreen
          countryCode={countryCode}
          phone={phone}
          onChangeCountry={changeCountryCode}
          onChangePhone={changePhone}
          message={message}
        />
      </ExternalLoginChrome>
    );
  }

  return (
    <ExternalLoginChrome
      title={t('login.codeTitle')}
      onBack={() => {
        setStep('phone');
        setCode('');
        setMessage(null);
      }}
      backDisabled={busy}
      footer={
        <Button
          label={t('login.signIn')}
          onPress={signIn}
          loading={busy}
          disabled={code.length < SMS_CODE_LENGTH}
        />
      }
    >
      <ExternalCodeScreen
        phoneNumber={phoneNumber}
        code={code}
        busy={busy}
        message={message}
        onChangeCode={changeCode}
        onResend={resendCode}
      />
    </ExternalLoginChrome>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.brand,
  },
  choice: {
    marginHorizontal: spacing.md,
    gap: spacing.md,
  },
  noticeBox: {
    backgroundColor: colors.buttonLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  version: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
  },
  choiceNotice: { color: colors.text, fontSize: 16, textAlign: 'center' },
  choiceError: { color: colors.danger, fontSize: 16, textAlign: 'center' },
});
