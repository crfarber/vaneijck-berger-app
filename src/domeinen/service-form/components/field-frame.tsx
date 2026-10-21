import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';
import type { ServiceFormError } from '../domain/types';

const ERROR_KEYS = {
  required: 'serviceForm.errors.required',
  'max-length': 'serviceForm.errors.maxLength',
  'max-value': 'serviceForm.errors.maxValue',
  'min-value': 'serviceForm.errors.minValue',
  'signature-name-required': 'serviceForm.errors.signatureName',
  'signature-email-required': 'serviceForm.errors.signatureEmail',
} as const;

export function useErrorText(error: ServiceFormError | undefined): string | null {
  const { t } = useTranslation();
  return error ? t(ERROR_KEYS[error.code], { limit: error.limit ?? '' }) : null;
}

/** Label and error text around one input. Required labels end with a red asterisk. */
export function FieldFrame({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional: boolean;
  error?: ServiceFormError;
  children: ReactNode;
}) {
  const errorText = useErrorText(error);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {optional ? null : <Text style={styles.requiredMark}> *</Text>}
      </Text>
      {children}
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  box: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  boxError: { borderColor: colors.danger },
  readonlyBox: { backgroundColor: colors.surface, borderColor: colors.surface },
  value: { color: colors.text, fontSize: 16 },
  placeholder: { color: colors.textMuted, fontSize: 16 },
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  requiredMark: { color: colors.danger, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14 },
});
