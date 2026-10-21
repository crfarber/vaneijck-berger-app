import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { hasSignatureInk } from '@/domeinen/signatures';
import { TextField } from '@/shared/ui/text-field';
import { Toggle } from '@/shared/ui/toggle';
import { colors, spacing } from '@/shared/ui/theme';
import {
  hasTransportConditions,
  resolveTransportConditionsUrl,
} from '../domain/transport-conditions';
import type { ServiceFormAnswer, ServiceFormError, ServiceFormField } from '../domain/types';
import { isSignatureSkippable } from '../domain/validation';
import { useServiceFormStore } from '../store/service-form-store-provider';
import { FieldFrame } from './field-frame';
import { SignatureCaptureSheet } from './signature-capture-sheet';
import { SignatureThumbnail } from './signature-thumbnail';

export function SignatureInputField({
  field,
  answer,
  error,
  onChange,
  registerInputRef,
  onFocus,
  onBlur,
}: {
  field: ServiceFormField;
  answer: ServiceFormAnswer | undefined;
  error: ServiceFormError | undefined;
  onChange: (fieldKey: string, answer: ServiceFormAnswer) => void;
  registerInputRef?: (fieldId: string, node: TextInput | null) => void;
  onFocus?: (field: ServiceFormField) => void;
  onBlur: (field: ServiceFormField) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const answers = useServiceFormStore((state) => state.answers);
  const hideSignature = useServiceFormStore((state) => state.hideSignature);
  const noEmailConfirmation = useServiceFormStore((state) => state.noEmailConfirmation);
  const toggleHideSignature = useServiceFormStore((state) => state.toggleHideSignature);
  const toggleNoEmailConfirmation = useServiceFormStore((state) => state.toggleNoEmailConfirmation);
  const acceptedTerms = useServiceFormStore((state) => state.acceptedTermsAndConditions);
  const setAcceptedTerms = useServiceFormStore((state) => state.setAcceptedTermsAndConditions);
  const requiresTerms = useServiceFormStore((state) => state.termsAcceptanceRequired);

  const skippable = isSignatureSkippable(field, answers);
  const markedHidden = Boolean(hideSignature[field.key]);
  const hidden = skippable && markedHidden;
  const available = !hidden;
  const noEmail = Boolean(noEmailConfirmation[field.key]);
  const hasInk = hasSignatureInk(answer?.value);
  const capturedLabel = t('serviceForm.signature.captured');
  const showTermsAcceptance = requiresTerms && hasTransportConditions(field);
  const termsUrl = resolveTransportConditionsUrl(field);

  useEffect(() => {
    if (!skippable && markedHidden) {
      toggleHideSignature(field.key);
    }
  }, [skippable, markedHidden, field.key, toggleHideSignature]);

  const nameInvalid = error?.code === 'signature-name-required';
  const emailInvalid = error?.code === 'signature-email-required';
  const inkInvalid = error?.code === 'required';

  const patch = (partial: Partial<ServiceFormAnswer>): void => {
    onChange(field.key, {
      value: answer?.value ?? '',
      displayValue: answer?.displayValue ?? '',
      signatureName: answer?.signatureName ?? '',
      email: answer?.email ?? '',
      ...partial,
    });
  };

  return (
    <FieldFrame label={field.label} optional={field.optional}>
      <View style={styles.stack}>
        {skippable ? (
          <Toggle
            label={t('serviceForm.signature.available')}
            value={available}
            onValueChange={(next) => {
              onFocus?.(field);
              if (next !== available) {
                toggleHideSignature(field.key);
              }
              if (!next) {
                patch({ value: '', displayValue: '' });
              }
              onBlur(field);
            }}
          />
        ) : null}
        {!hidden ? (
          <>
            <TextField
              inputRef={(node) => registerInputRef?.(field.id, node)}
              label={t('serviceForm.signature.name')}
              value={answer?.signatureName ?? ''}
              onChangeText={(signatureName) => patch({ signatureName })}
              onFocus={() => onFocus?.(field)}
              onBlur={() => onBlur(field)}
              error={nameInvalid ? '' : null}
            />
            <Toggle
              label={t('serviceForm.signature.noEmailConfirmation')}
              value={noEmail}
              onValueChange={(next) => {
                onFocus?.(field);
                if ((next === true) !== noEmail) {
                  toggleNoEmailConfirmation(field.key);
                }
                if (next === true) {
                  patch({ email: '' });
                }
              }}
            />
            {!noEmail ? (
              <TextField
                label={t('serviceForm.signature.email')}
                value={answer?.email ?? ''}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(email) => patch({ email })}
                onFocus={() => onFocus?.(field)}
                onBlur={() => onBlur(field)}
                error={emailInvalid ? '' : null}
              />
            ) : null}
            <View style={styles.signatureBlock}>
              <Text style={[styles.signatureLabel, inkInvalid && styles.signatureLabelError]}>
                {t('serviceForm.signature.capture')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  hasInk ? t('serviceForm.signature.replace') : t('serviceForm.signature.capture')
                }
                onPress={() => {
                  onFocus?.(field);
                  setOpen(true);
                }}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <SignatureThumbnail uri={answer?.value} invalid={inkInvalid} />
              </Pressable>
            </View>
          </>
        ) : null}
        {showTermsAcceptance ? (
          <View style={styles.terms}>
            <Toggle
              label={t('serviceForm.signature.acceptTerms')}
              labelAction={
                termsUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t('serviceForm.signature.viewTerms')}
                    onPress={() =>
                      void Linking.openURL(termsUrl).catch(() =>
                        Alert.alert(t('common.somethingWrong')),
                      )
                    }
                    style={({ pressed }) => [styles.viewTerms, pressed && styles.pressed]}
                  >
                    <Text style={styles.viewTermsText}>{t('serviceForm.signature.viewTerms')}</Text>
                  </Pressable>
                ) : null
              }
              value={acceptedTerms}
              onValueChange={(next) => {
                onFocus?.(field);
                setAcceptedTerms(next);
                onBlur(field);
              }}
            />
          </View>
        ) : null}
      </View>
      <SignatureCaptureSheet
        visible={open}
        onClose={() => setOpen(false)}
        onCapture={(dataUrl) => {
          setOpen(false);
          patch({ value: dataUrl, displayValue: capturedLabel });
          onBlur(field);
        }}
      />
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  signatureBlock: { gap: spacing.xs },
  signatureLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  signatureLabelError: { color: colors.danger },
  terms: { gap: spacing.xs },
  viewTerms: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  viewTermsText: {
    marginTop: -spacing.xs,
    color: colors.brandAction,
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  pressed: { opacity: 0.7 },
});
