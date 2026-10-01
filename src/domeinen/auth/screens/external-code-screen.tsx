import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import vrsLogo from '@/assets/images/vrs-logo.png';
import { useScheduler } from '@/shared/ui/scheduler-context';
import { colors, radius, spacing } from '@/shared/ui/theme';

export const SMS_CODE_LENGTH = 6;

const RESEND_SECONDS = 60;
const CODE_SLOTS = [0, 1, 2, 3, 4, 5] as const;

function resendClock(seconds: number): string {
  return `00:${String(seconds).padStart(2, '0')}`;
}

type ExternalCodeScreenProps = {
  phoneNumber: string;
  code: string;
  busy: boolean;
  message: string | null;
  onChangeCode: (value: string) => void;
  onResend: () => Promise<boolean>;
};

/** Six-digit SMS code step for an external driver. */
export function ExternalCodeScreen({
  phoneNumber,
  code,
  busy,
  message,
  onChangeCode,
  onResend,
}: ExternalCodeScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scheduler = useScheduler();
  const inputRef = useRef<TextInput>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    return scheduler.schedule(() => {
      setResendIn((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
  }, [resendIn, scheduler]);

  const requestAgain = (): void => {
    if (resendIn > 0 || busy) {
      return;
    }
    setResendIn(RESEND_SECONDS);
    void onResend().then((sent) => {
      if (sent) {
        onChangeCode('');
      }
    });
  };

  return (
    <View style={styles.step}>
      <Image
        source={vrsLogo}
        resizeMode="contain"
        style={[styles.logo, { width: width - 100 }]}
        accessibilityIgnoresInvertColors
      />
      <Text style={styles.hint}>{t('login.smsSent')}</Text>
      <Text style={styles.phoneNumber}>{phoneNumber}</Text>
      <View style={styles.codeBlock}>
        <TextInput
          ref={inputRef}
          accessibilityLabel={t('login.code')}
          value={code}
          onChangeText={onChangeCode}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={SMS_CODE_LENGTH}
          style={styles.hiddenCode}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('login.code')}
          onPress={() => inputRef.current?.focus()}
          style={styles.codeRow}
        >
          {CODE_SLOTS.map((index) => {
            const digit = code[index] ?? '';
            const active = code.length === index;
            return (
              <View key={index} style={[styles.codeSlot, active && styles.codeSlotActive]}>
                <Text style={styles.codeDigit}>{digit}</Text>
              </View>
            );
          })}
        </Pressable>
        {resendIn > 0 ? (
          <Text style={styles.resendWait}>
            {t('login.resendWait', { time: resendClock(resendIn) })}
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={requestAgain}
            style={styles.resendLink}
          >
            <Text style={styles.resendLabel}>{t('login.requestAgain')}</Text>
          </Pressable>
        )}
      </View>
      {message ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { width: '100%', alignItems: 'center', gap: spacing.lg },
  logo: { height: 40, marginTop: spacing.xl },
  hint: { textAlign: 'center', fontWeight: '700', fontSize: 16, color: colors.text },
  phoneNumber: { fontWeight: '700', fontSize: 20, color: colors.text },
  codeBlock: { width: '100%' },
  hiddenCode: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: spacing.md,
  },
  codeSlot: {
    width: 44,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeSlotActive: { borderWidth: 1.5, borderColor: colors.brandAction },
  codeDigit: { fontSize: 24, fontWeight: '700', color: colors.text },
  resendWait: { textAlign: 'center', fontSize: 13, color: colors.textMuted },
  resendLink: { alignSelf: 'flex-end' },
  resendLabel: { fontSize: 14, color: colors.text },
  error: { color: colors.danger, fontSize: 16, textAlign: 'center' },
});
