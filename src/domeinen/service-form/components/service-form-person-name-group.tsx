import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { confirm } from '@/shared/ui/confirm';
import { TextField } from '@/shared/ui/text-field';
import { colors, radius, spacing, type as typography } from '@/shared/ui/theme';
import {
  buildClearedPersonNameAnswers,
  buildPersonNameAnswers,
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
 * Compact free-text name entry. A square action beside the field splits the name (confirm, then
 * fill CRM roles) and afterwards clears those roles while keeping the typed text.
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
  const splitApplied = appliedFreeText !== null;

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
      <View style={styles.inputRow}>
        <TextField
          containerStyle={styles.grow}
          label={t('serviceForm.personName.freeTextLabel')}
          value={freeText}
          onChangeText={onFreeTextChange}
          placeholder={t('serviceForm.personName.freeTextPlaceholder')}
          autoCapitalize="words"
          accessibilityLabel={t('serviceForm.personName.freeTextLabel')}
        />
        {freeText.trim() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              splitApplied ? t('serviceForm.personName.reset') : t('serviceForm.personName.apply')
            }
            onPress={() => {
              if (splitApplied) {
                clearDerived();
                return;
              }
              void applyFreeText();
            }}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={splitApplied ? 'refresh' : 'cut-outline'}
              size={20}
              color={colors.brandText}
            />
          </Pressable>
        ) : null}
      </View>
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
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  grow: { flex: 1 },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  manualHint: {
    ...typography.small,
    color: colors.textMuted,
  },
});
