import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';
import {
  getVehicleSectionFieldOrder,
  isRdwPlateField,
  RDW_READONLY_FIELD_NAME_SET,
  rdwReadonlyDisplay,
} from '../domain/rdw-autofill';
import type {
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormError,
  ServiceFormField,
} from '../domain/types';
import type { FetchRdwInfo } from '../hooks/service-form-context';
import { useRdwVehicleRegistration } from '../hooks/use-rdw-vehicle-registration';
import { ReadonlyFieldSummary } from './readonly-field-summary';
import { ServiceFieldRenderer } from './service-field-renderer';

export type ServiceFormVehicleRegistrationGroupProps = {
  fields: ServiceFormField[];
  answers: ServiceFormAnswers;
  errors: Record<string, ServiceFormError | undefined>;
  pleaseSelectLabel: string;
  readOnly: boolean;
  fetchRdwInfo: FetchRdwInfo | undefined;
  updateAnswer: (fieldKey: string, answer: ServiceFormAnswer) => void;
  updateAnswers: (answers: ServiceFormAnswers) => void;
  setFieldsRequired: (fieldKeys: string[], required: boolean) => void;
  onFocus?: (field: ServiceFormField) => void;
  onBlur: (field: ServiceFormField) => void;
  registerFieldRef?: (fieldId: string, node: View | null) => void;
  registerInputRef?: (fieldId: string, node: TextInput | null) => void;
  onFieldLayout?: (fieldId: string) => void;
};

/**
 * Vehicle fields in fixed order (plate first), with RDW autofill when `fetchRdwInfo` is wired.
 * Only renders keys that exist in the schema — missing CRM fields are skipped.
 * In preview/overview (`readOnly`) this collapses to the same summary as other sections.
 */
export function ServiceFormVehicleRegistrationGroup({
  fields,
  answers,
  errors,
  pleaseSelectLabel,
  readOnly,
  fetchRdwInfo,
  updateAnswer,
  updateAnswers,
  setFieldsRequired,
  onFocus,
  onBlur,
  registerFieldRef,
  registerInputRef,
  onFieldLayout,
}: ServiceFormVehicleRegistrationGroupProps) {
  const { t } = useTranslation();
  const [showManualVehicleFields, setShowManualVehicleFields] = useState(false);
  const fieldByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);
  const fieldKeys = useMemo(() => new Set(fields.map((field) => field.key)), [fields]);
  const getAnswers = useCallback(() => answers, [answers]);

  const { rdwInfo, rdwLookupFailed, handlePlateChange } = useRdwVehicleRegistration({
    pleaseSelectLabel,
    fetchRdwInfo: readOnly ? undefined : fetchRdwInfo,
    fieldKeys,
    getAnswers,
    updateAnswers,
    setFieldsRequired,
  });

  const hideManualVehicleFields = Boolean(rdwInfo) && !showManualVehicleFields && !rdwLookupFailed;
  const orderedFieldKeys = getVehicleSectionFieldOrder(fieldKeys, {
    rdwLookupFailed,
    hideManualVehicleFields: readOnly ? false : hideManualVehicleFields,
  });
  const orderedFields = orderedFieldKeys.flatMap((key) => {
    const field = fieldByKey.get(key);
    return field ? [field] : [];
  });

  if (readOnly) {
    const displayAnswers: ServiceFormAnswers = { ...answers };
    for (const key of orderedFieldKeys) {
      const overlay = rdwReadonlyDisplay(key, rdwInfo);
      if (overlay !== undefined) {
        displayAnswers[key] = { value: overlay, displayValue: overlay };
      }
    }
    return <ReadonlyFieldSummary fields={orderedFields} answers={displayAnswers} />;
  }

  const lastRdwReadonlyKey = [...orderedFieldKeys]
    .reverse()
    .find((key) => RDW_READONLY_FIELD_NAME_SET.has(key));

  return (
    <View style={styles.container}>
      {orderedFieldKeys.map((fieldKey) => {
        const field = fieldByKey.get(fieldKey);
        if (!field) {
          return null;
        }
        const rdwDisplay = rdwReadonlyDisplay(fieldKey, rdwInfo);
        const answer =
          rdwDisplay !== undefined
            ? { value: rdwDisplay, displayValue: rdwDisplay }
            : answers[field.key];
        const isPlate = isRdwPlateField(field.key);
        const isNavigable = rdwDisplay === undefined && !field.readOnly;

        return (
          <View
            key={field.id}
            collapsable={false}
            ref={(node) => registerFieldRef?.(field.id, isNavigable ? node : null)}
            onLayout={() => {
              if (isNavigable) {
                onFieldLayout?.(field.id);
              }
            }}
          >
            <ServiceFieldRenderer
              field={rdwDisplay !== undefined ? { ...field, readOnly: true } : field}
              answer={answer}
              error={errors[field.key]}
              dependencyAnswer={
                field.dependencies?.required ? answers[field.dependencies.required] : undefined
              }
              pleaseSelectLabel={pleaseSelectLabel}
              onChange={(key, next) => {
                if (isPlate) {
                  handlePlateChange(String(next.displayValue ?? next.value ?? ''));
                  return;
                }
                updateAnswer(key, next);
              }}
              registerInputRef={registerInputRef}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            {rdwInfo && !showManualVehicleFields && fieldKey === lastRdwReadonlyKey ? (
              <Pressable
                onPress={() => setShowManualVehicleFields(true)}
                style={styles.incorrectLink}
                accessibilityRole="button"
              >
                <Text style={styles.incorrectLinkText}>{t('serviceForm.rdw.notCorrect')}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  incorrectLink: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  incorrectLinkText: {
    color: colors.brandAction,
    textDecorationLine: 'underline',
    fontSize: 14,
  },
});
