import { StyleSheet, Text, View } from 'react-native';
import { hasSignatureInk } from '@/domeinen/signatures';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { resolveFieldKind } from '../domain/field-kind';
import type { ServiceFormAnswers, ServiceFormField } from '../domain/types';
import { SignatureThumbnail } from './signature-thumbnail';

const shown = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '–' : String(value);

/** Consecutive read-only fields as one compact label/value list. */
export function ReadonlyFieldSummary({
  fields,
  answers,
}: {
  fields: readonly ServiceFormField[];
  answers: ServiceFormAnswers;
}) {
  return (
    <View style={styles.box}>
      {fields.map((field) => {
        const answer = answers[field.key];
        const isSignature = resolveFieldKind(field) === 'signature';
        const ink = isSignature && hasSignatureInk(answer?.value);
        return (
          <View key={field.id} style={styles.row}>
            <Text style={styles.label}>{field.label}</Text>
            {ink ? (
              <SignatureThumbnail uri={answer?.value} />
            ) : (
              <Text style={styles.value}>{shown(answer?.displayValue)}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { gap: 2 },
  label: { color: colors.textMuted, fontSize: 13 },
  value: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
