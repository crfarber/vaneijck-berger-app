import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { hasSignatureInk } from '@/domeinen/signatures';
import { TextField } from '@/shared/ui/text-field';
import { colors, spacing } from '@/shared/ui/theme';
import type { ServiceFormAnswer, ServiceFormError, ServiceFormField } from '../domain/types';
import { useServiceFormStore } from '../store/service-form-store-provider';
import { BooleanToggle } from './boolean-toggle';
import { FieldFrame, useErrorText } from './field-frame';
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
  const errorText = useErrorText(error);
  const [open, setOpen] = useState(false);
  const hideSignature = useServiceFormStore((state) => state.hideSignature);
  const noEmailConfirmation = useServiceFormStore((state) => state.noEmailConfirmation);
  const toggleHideSignature = useServiceFormStore((state) => state.toggleHideSignature);
  const toggleNoEmailConfirmation = useServiceFormStore((state) => state.toggleNoEmailConfirmation);
  const acceptedTerms = useServiceFormStore((state) => state.acceptedTermsAndConditions);
  const setAcceptedTerms = useServiceFormStore((state) => state.setAcceptedTermsAndConditions);
  const requiresTerms = useServiceFormStore((state) => state.termsAcceptanceRequired);

  const hidden = Boolean(hideSignature[field.key]);
  const noEmail = Boolean(noEmailConfirmation[field.key]);
  const hasInk = hasSignatureInk(answer?.value);
  const capturedLabel = t('serviceForm.signature.captured');

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
    <FieldFrame label={field.label} optional={field.optional} error={error}>
      <View style={styles.stack}>
        <BooleanToggle
          value={hidden ? true : false}
          optional={false}
          labels={{
            yes: t('serviceForm.signature.notAvailable'),
            no: t('serviceForm.signature.available'),
            clear: t('serviceForm.clear'),
          }}
          hasError={false}
          onChange={(next) => {
            onFocus?.(field);
            if ((next === true) !== hidden) {
              toggleHideSignature(field.key);
            }
            if (next === true) {
              patch({ value: '', displayValue: '' });
            }
            onBlur(field);
          }}
        />
        {!hidden ? (
          <>
            <TextField
              inputRef={(node) => registerInputRef?.(field.id, node)}
              label={t('serviceForm.signature.name')}
              value={answer?.signatureName ?? ''}
              onChangeText={(signatureName) => patch({ signatureName })}
              onFocus={() => onFocus?.(field)}
              onBlur={() => onBlur(field)}
              error={error?.code === 'signature-name-required' ? errorText : null}
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
                error={error?.code === 'signature-email-required' ? errorText : null}
              />
            ) : null}
            <BooleanToggle
              value={noEmail ? true : false}
              optional={false}
              labels={{
                yes: t('serviceForm.signature.noEmail'),
                no: t('serviceForm.signature.withEmail'),
                clear: t('serviceForm.clear'),
              }}
              hasError={false}
              onChange={(next) => {
                onFocus?.(field);
                if ((next === true) !== noEmail) {
                  toggleNoEmailConfirmation(field.key);
                }
                if (next === true) {
                  patch({ email: '' });
                }
                onBlur(field);
              }}
            />
            {requiresTerms ? (
              <BooleanToggle
                value={acceptedTerms ? true : false}
                optional={false}
                labels={{
                  yes: t('serviceForm.signature.termsAccepted'),
                  no: t('serviceForm.signature.termsRejected'),
                  clear: t('serviceForm.clear'),
                }}
                hasError={false}
                onChange={(next) => {
                  onFocus?.(field);
                  setAcceptedTerms(next === true);
                }}
              />
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onFocus?.(field);
                setOpen(true);
              }}
              style={({ pressed }) => [styles.capture, pressed && styles.pressed]}
            >
              <Text style={styles.captureText}>
                {hasInk ? t('serviceForm.signature.replace') : t('serviceForm.signature.capture')}
              </Text>
            </Pressable>
            {hasInk ? (
              <>
                <SignatureThumbnail uri={answer?.value} />
                <Text style={styles.captured}>{capturedLabel}</Text>
              </>
            ) : null}
          </>
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
  capture: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
  },
  captureText: { color: colors.brandText, fontWeight: '700', fontSize: 16 },
  captured: { color: colors.success, fontSize: 14 },
  pressed: { opacity: 0.7 },
});
