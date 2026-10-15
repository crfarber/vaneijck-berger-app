import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type TextInput } from 'react-native';
import { Button } from '@/shared/ui/button';
import { confirm } from '@/shared/ui/confirm';
import { TextField } from '@/shared/ui/text-field';
import { colors, radius, spacing, type as typography } from '@/shared/ui/theme';
import {
  buildClearedPersonNameAnswers,
  buildPersonNameAnswers,
  buildPersonNameSummary,
  hasAppliedPersonNameAnswers,
  previewPersonNameParse,
  type PersonNameEntryGroup,
} from '../domain/person-name-entry';
import { serviceFormSelectOptionsQueryKey } from '../domain/select-options-query-key';
import type { SelectOption } from '../domain/select-options';
import type {
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormError,
  ServiceFormField,
} from '../domain/types';
import { useServiceFormService } from '../hooks/service-form-context';
import { DevGroupAnswersButton } from './dev-group-answers-button';
import { ReadonlyFieldSummary } from './readonly-field-summary';
import { ServiceFieldRenderer } from './service-field-renderer';

export type ServiceFormPersonNameGroupProps = {
  group: PersonNameEntryGroup;
  answers: ServiceFormAnswers;
  errors: Record<string, ServiceFormError | undefined>;
  pleaseSelectLabel: string;
  readOnly: boolean;
  updateAnswer: (fieldKey: string, answer: ServiceFormAnswer) => void;
  updateAnswers: (answers: ServiceFormAnswers) => void;
  onFocus?: (field: ServiceFormField) => void;
  onBlur: (field: ServiceFormField) => void;
  registerFieldRef?: (fieldId: string, node: View | null) => void;
  registerInputRef?: (fieldId: string, node: TextInput | null) => void;
  onFieldLayout?: (fieldId: string) => void;
};

/**
 * Free-text name entry with confirm → fill CRM name roles, plus always-editable manual fields.
 */
export function ServiceFormPersonNameGroup({
  group,
  answers,
  errors,
  pleaseSelectLabel,
  readOnly,
  updateAnswer,
  updateAnswers,
  onFocus,
  onBlur,
  registerFieldRef,
  registerInputRef,
  onFieldLayout,
}: ServiceFormPersonNameGroupProps) {
  const { t, i18n } = useTranslation();
  const service = useServiceFormService();
  const mapping = group.mapping;
  const salutationField = group.orderedFields.find((field) => field.key === mapping.salutation);
  const [freeText, setFreeText] = useState('');
  const [appliedFreeText, setAppliedFreeText] = useState<string | null>(null);
  const applied = hasAppliedPersonNameAnswers(mapping, answers, pleaseSelectLabel);
  const summary = buildPersonNameSummary(mapping, answers, pleaseSelectLabel);

  const salutationQuery = useQuery({
    queryKey: salutationField
      ? serviceFormSelectOptionsQueryKey(salutationField, undefined)
      : ['service-form', 'person-name', 'no-salutation'],
    queryFn: () =>
      service.loadSelectOptions({
        table: salutationField?.table,
        sortOptions: salutationField?.sortOptions,
        dependencyValue: undefined,
      }),
    enabled: Boolean(salutationField?.table),
  });

  const salutationOptions: readonly SelectOption[] =
    salutationQuery.data?.kind === 'options' ? salutationQuery.data.options : [];

  const title =
    (i18n.language.toLowerCase().startsWith('en')
      ? group.config.label.en
      : group.config.label.nl) ?? t('serviceForm.personName.title');

  const debugFields = useMemo(() => group.orderedFields, [group.orderedFields]);

  const clearDerived = (): void => {
    setAppliedFreeText(null);
    updateAnswers(buildClearedPersonNameAnswers(mapping, pleaseSelectLabel));
  };

  const applyFreeText = async (): Promise<void> => {
    const trimmed = freeText.trim();
    if (!trimmed) {
      return;
    }
    const { parsed, preview } = previewPersonNameParse(trimmed, salutationOptions);
    if (!parsed.lastName && !parsed.firstName && !parsed.initials && !parsed.middleName) {
      return;
    }
    const accepted =
      !group.config.confirmName ||
      (await confirm({
        title: t('serviceForm.personName.confirmTitle'),
        message: preview || trimmed,
        confirmLabel: t('serviceForm.personName.confirmApply'),
        cancelLabel: t('serviceForm.personName.confirmReject'),
      }));
    if (!accepted) {
      return;
    }
    updateAnswers(
      buildPersonNameAnswers(mapping, parsed, {
        salutationOptions,
        salutationTable: salutationField?.table,
        pleaseSelectLabel,
      }),
    );
    setAppliedFreeText(trimmed);
  };

  const onFreeTextChange = (next: string): void => {
    setFreeText(next);
    if (appliedFreeText !== null && next.trim() !== appliedFreeText.trim()) {
      setAppliedFreeText(null);
      updateAnswers(buildClearedPersonNameAnswers(mapping, pleaseSelectLabel));
    }
  };

  const debugButton = <DevGroupAnswersButton answers={answers} fields={debugFields} />;

  if (readOnly) {
    return (
      <View style={styles.container}>
        <ReadonlyFieldSummary fields={group.orderedFields} answers={answers} />
        {debugButton}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <TextField
        label={t('serviceForm.personName.freeTextLabel')}
        value={freeText}
        onChangeText={onFreeTextChange}
        placeholder={t('serviceForm.personName.freeTextPlaceholder')}
        autoCapitalize="words"
        accessibilityLabel={t('serviceForm.personName.freeTextLabel')}
      />
      <Button
        label={t('serviceForm.personName.apply')}
        onPress={() => {
          void applyFreeText();
        }}
        disabled={!freeText.trim()}
      />
      {applied && summary ? (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>{summary}</Text>
          <Button
            label={t('serviceForm.personName.reset')}
            variant="secondary"
            onPress={clearDerived}
          />
        </View>
      ) : null}
      <Text style={styles.manualHint}>{t('serviceForm.personName.manualHint')}</Text>
      {group.orderedFields.map((field) => (
        <View
          key={field.id}
          collapsable={false}
          ref={(node) => registerFieldRef?.(field.id, node)}
          onLayout={() => onFieldLayout?.(field.id)}
        >
          <ServiceFieldRenderer
            field={field}
            answer={answers[field.key]}
            error={errors[field.key]}
            dependencyAnswer={
              field.dependencies?.required ? answers[field.dependencies.required] : undefined
            }
            pleaseSelectLabel={pleaseSelectLabel}
            onChange={updateAnswer}
            onAnswersChange={updateAnswers}
            registerInputRef={registerInputRef}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </View>
      ))}
      {debugButton}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.header,
    color: colors.text,
  },
  summaryBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryText: {
    ...typography.body,
    color: colors.text,
  },
  manualHint: {
    ...typography.small,
    color: colors.textMuted,
  },
});
