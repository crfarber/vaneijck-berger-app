import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import vrsLogo from '@/assets/images/vrs-logo.png';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { CountryCodePicker } from '../components/country-code-picker';

type ExternalPhoneScreenProps = {
  countryCode: string;
  phone: string;
  onChangeCountry: (dialCode: string) => void;
  onChangePhone: (value: string) => void;
  message: string | null;
};

/** Phone number step for an external driver. */
export function ExternalPhoneScreen({
  countryCode,
  phone,
  onChangeCountry,
  onChangePhone,
  message,
}: ExternalPhoneScreenProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  return (
    <View style={styles.step}>
      <Image
        source={vrsLogo}
        resizeMode="contain"
        style={[styles.logo, { width: width - 50 }]}
        accessibilityIgnoresInvertColors
      />
      <Text style={styles.hint}>{t('login.externalHint')}</Text>
      <View style={styles.phonePill}>
        <CountryCodePicker selectedDialCode={countryCode} onSelect={onChangeCountry} />
        <TextInput
          accessibilityLabel={t('login.phoneNumber')}
          value={phone}
          onChangeText={onChangePhone}
          placeholder={t('login.phonePlaceholder')}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.phoneInput}
        />
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
  logo: { height: 70, marginTop: spacing.xl },
  hint: { textAlign: 'center', fontWeight: '700', fontSize: 16, color: colors.text },
  phonePill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputFill,
    borderBottomLeftRadius: radius.md,
    borderTopLeftRadius: radius.md,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    marginLeft: spacing.sm,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.inputFill,
    borderBottomRightRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  error: { color: colors.danger, fontSize: 16, textAlign: 'center' },
});
