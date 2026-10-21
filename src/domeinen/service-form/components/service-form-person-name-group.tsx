import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { Button } from '@/shared/ui/button';
import { confirm } from '@/shared/ui/confirm';
import { TextField } from '@/shared/ui/text-field';
import { colors, radius, spacing, type as typography } from '@/shared/ui/theme';
import {
  buildClearedPersonNameAnswers,
  buildPersonNameAnswers,
  hasAppliedPersonNameAnswers,
  previewPersonNameParse,
  resolvePersonNameSummaryDisplay,
  shouldOfferPersonNameManualEntry,
  shouldShowPersonNameDetailFields,
  type PersonNameEntryGroup,
} from '../domain/person-name-entry';
import type {
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormError,
  ServiceFormField,
} from '../domain/types';
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
 * Compact free-text name entry: aanhef dropdown above full name (not parsed from free text);
 * other roles behind Handmatig invullen; after apply a green summary with edit / Opnieuw.
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
  const mapping = group.mapping;
  const salutationField = group.salutationField;
  const [freeText, setFreeText] = useState('');
  const [appliedFreeText, setAppliedFreeText] = useState<string | null>(null);
  const [manualEntryActive, setManualEntryActive] = useState(false);

  const hasAppliedAnswers = hasAppliedPersonNameAnswers(mapping, answers, pleaseSelectLabel);
  const summaryText = resolvePersonNameSummaryDisplay(mapping, answers, pleaseSelectLabel, {
    manualEntryActive,
  });
  const showDetailFields = shouldShowPersonNameDetailFields({ manualEntryActive });
  const offerManualEntry = shouldOfferPersonNameManualEntry({
    hasAppliedAnswers,
    manualEntryActive,
  });
  const showSummary = Boolean(summaryText) && hasAppliedAnswers && !manualEntryActive;

  const title =
    (i18n.language.toLowerCase().startsWith('en')
      ? group.config.label.en
      : group.config.label.nl) ?? t('serviceForm.personName.title');

  const debugFields = useMemo(() => {
    const fields = [...group.orderedFields];
    if (salutationField) {
      fields.unshift(salutationField);
    }
    return fields;
  }, [group.orderedFields, salutationField]);

  const clearDerived = (): void => {
    setAppliedFreeText(null);
    setManualEntryActive(false);
    updateAnswers(buildClearedPersonNameAnswers(mapping, pleaseSelectLabel));
  };

  const applyFreeText = async (): Promise<void> => {
    const trimmed = freeText.trim();
    if (!trimmed) {
      return;
    }
    const { parsed, preview } = previewPersonNameParse(trimmed);
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
      setManualEntryActive(true);
      return;
    }
    updateAnswers(
      buildPersonNameAnswers(mapping, parsed, {
        pleaseSelectLabel,
      }),
    );
    setAppliedFreeText(trimmed);
    setManualEntryActive(false);
  };

  const onFreeTextChange = (next: string): void => {
    setFreeText(next);
    if (appliedFreeText !== null && next.trim() !== appliedFreeText.trim()) {
      setAppliedFreeText(null);
      updateAnswers(buildClearedPersonNameAnswers(mapping, pleaseSelectLabel));
    }
  };

  const renderSalutation = (): ReactNode => {
    if (!salutationField) {
      return null;
    }
    return (
      <View
        collapsable={false}
        ref={(node) => registerFieldRef?.(salutationField.id, node)}
        onLayout={() => onFieldLayout?.(salutationField.id)}
      >
        <ServiceFieldRenderer
          field={salutationField}
          answer={answers[salutationField.key]}
          error={errors[salutationField.key]}
          dependencyAnswer={
            salutationField.dependencies?.required
              ? answers[salutationField.dependencies.required]
              : undefined
          }
          pleaseSelectLabel={pleaseSelectLabel}
          onChange={updateAnswer}
          onAnswersChange={updateAnswers}
          registerInputRef={registerInputRef}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
    );
  };

  const debugButton = <DevGroupAnswersButton answers={answers} fields={debugFields} />;

  if (readOnly) {
    const summaryFields = salutationField
      ? [salutationField, ...group.orderedFields]
      : group.orderedFields;
    return (
      <View style={styles.container}>
        <ReadonlyFieldSummary fields={summaryFields} answers={answers} />
        {debugButton}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {renderSalutation()}
      {showSummary ? (
        <>
          <Text style={styles.summary} accessibilityLiveRegion="polite" numberOfLines={0}>
            {summaryText}
          </Text>
          <View style={styles.modeLink}>
            <Button
              label={t('serviceForm.personName.manualEntry')}
              variant="text"
              onPress={() => setManualEntryActive(true)}
            />
            <Button
              label={t('serviceForm.personName.reset')}
              variant="text"
              onPress={clearDerived}
            />
          </View>
        </>
      ) : (
        <>
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
                accessibilityLabel={t('serviceForm.personName.apply')}
                onPress={() => {
                  void applyFreeText();
                }}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
              >
                <Ionicons name="cut-outline" size={20} color={colors.brandText} />
              </Pressable>
            ) : null}
          </View>
          {offerManualEntry ? (
            <View style={styles.modeLink}>
              <Button
                label={t('serviceForm.personName.manualEntry')}
                variant="text"
                onPress={() => setManualEntryActive(true)}
              />
            </View>
          ) : null}
          {manualEntryActive ? (
            <View style={styles.modeLink}>
              <Button
                label={
                  hasAppliedAnswers
                    ? t('serviceForm.personName.useSummary')
                    : t('serviceForm.personName.useQuickEntry')
                }
                variant="text"
                onPress={() => setManualEntryActive(false)}
              />
            </View>
          ) : null}
        </>
      )}
      {showDetailFields
        ? group.orderedFields.map((field) => (
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
          ))
        : null}
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
  summary: {
    ...typography.small,
    textAlign: 'center',
    textTransform: 'capitalize',
    fontWeight: 'bold',
    color: colors.brandLight,
    backgroundColor: colors.success,
    padding: spacing.sm,
    borderRadius: radius.sm,
    flexShrink: 1,
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    width: '100%',
  },
  modeLink: { flexDirection: 'row', justifyContent: 'space-between' },
});
