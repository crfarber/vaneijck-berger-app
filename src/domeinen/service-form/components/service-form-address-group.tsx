import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View, type TextInput } from 'react-native';
import { Button } from '@/shared/ui/button';
import { colors, spacing, type as typography } from '@/shared/ui/theme';
import {
  buildClearedAddressEntryAnswers,
  getAddressEntryLookupFields,
  getAddressEntryResolvedFields,
  shouldShowResolvedAddressFields,
  type AddressEntryGroup,
} from '../domain/address-entry';
import { buildAddressPlaceAnswers } from '../domain/address-place-selection';
import { normalizeDutchPostalCode } from '../domain/postal-address-lookup';
import type {
  PostalAddressLookupInput,
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormError,
  ServiceFormField,
} from '../domain/types';
import { useLookupPostalAddress, useServiceFormService } from '../hooks/service-form-context';
import { ReadonlyFieldSummary } from './readonly-field-summary';
import { ServiceFieldRenderer } from './service-field-renderer';

export type ServiceFormAddressGroupProps = {
  group: AddressEntryGroup;
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

const answerText = (answer: ServiceFormAnswer | undefined): string =>
  String(answer?.displayValue ?? answer?.value ?? '').trim();

export function ServiceFormAddressGroup({
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
}: ServiceFormAddressGroupProps) {
  const { t } = useTranslation();
  const service = useServiceFormService();
  const lookupPostalAddress = useLookupPostalAddress();
  const [manualEntryActive, setManualEntryActive] = useState(false);
  const appliedLookupKey = useRef<string | null>(null);
  const lookupFields = useMemo(() => getAddressEntryLookupFields(group), [group]);
  const resolvedFields = useMemo(() => getAddressEntryResolvedFields(group), [group]);
  const postalCode = answerText(answers[group.mapping.postalcode ?? '']);
  const houseNumber = answerText(answers[group.mapping.houseno ?? '']);
  const houseNumberAddition = answerText(answers[group.mapping.housenoadd ?? '']);
  const normalizedPostalCode = normalizeDutchPostalCode(postalCode);
  const normalizedHouseNumber = /^\d+$/.test(houseNumber) ? houseNumber : null;
  const lookupInput: PostalAddressLookupInput = useMemo(
    () => ({ postalCode, houseNumber, houseNumberAddition }),
    [houseNumber, houseNumberAddition, postalCode],
  );
  const lookupKey = `${normalizedPostalCode ?? ''}|${normalizedHouseNumber ?? ''}|${houseNumberAddition}`;
  const hasResolvedAnswers = [group.mapping.street, group.mapping.city].some((fieldKey) =>
    fieldKey ? answerText(answers[fieldKey]) !== '' : false,
  );
  const lookupEnabled = Boolean(
    !readOnly &&
    group.config.postcodeHouseNumberLookup &&
    lookupPostalAddress &&
    normalizedPostalCode &&
    normalizedHouseNumber &&
    !hasResolvedAnswers &&
    !manualEntryActive,
  );
  const lookup = useQuery({
    queryKey: ['service-form', 'postal-address', group.anchor.id, lookupKey],
    queryFn: () => (lookupPostalAddress ? lookupPostalAddress(lookupInput) : null),
    enabled: lookupEnabled,
    retry: false,
  });
  const lookupUnavailable = group.config.postcodeHouseNumberLookup && !lookupPostalAddress;
  const lookupFailed = Boolean(
    lookupUnavailable || lookup.isError || (lookup.isFetched && lookup.data === null),
  );
  const showResolvedFields = shouldShowResolvedAddressFields(group, answers, {
    manualEntryActive,
    lookupFailed,
  });

  useEffect(() => {
    const address = lookup.data;
    if (!address || appliedLookupKey.current === lookupKey) {
      return;
    }
    appliedLookupKey.current = lookupKey;
    let active = true;
    void service.loadTable('dn_country').then((countries) => {
      if (active) {
        updateAnswers(
          buildAddressPlaceAnswers(group.anchor.key, address, group.mapping, countries),
        );
      }
    });
    return () => {
      active = false;
    };
  }, [group.anchor.key, group.mapping, lookup.data, lookupKey, service, updateAnswers]);

  if (readOnly) {
    return (
      <ReadonlyFieldSummary fields={[group.anchor, ...group.orderedFields]} answers={answers} />
    );
  }

  const renderField = (field: ServiceFormField, clearResolvedOnChange = false) => (
    <View
      key={field.id}
      collapsable={false}
      ref={(node) => registerFieldRef?.(field.id, field.readOnly ? null : node)}
      onLayout={() => {
        if (!field.readOnly) {
          onFieldLayout?.(field.id);
        }
      }}
    >
      <ServiceFieldRenderer
        field={field}
        answer={answers[field.key]}
        error={errors[field.key]}
        dependencyAnswer={
          field.dependencies?.required ? answers[field.dependencies.required] : undefined
        }
        pleaseSelectLabel={pleaseSelectLabel}
        onChange={(fieldKey, answer) => {
          if (clearResolvedOnChange) {
            appliedLookupKey.current = null;
            setManualEntryActive(false);
            updateAnswers({
              ...buildClearedAddressEntryAnswers(group),
              [fieldKey]: answer,
            });
            return;
          }
          updateAnswer(fieldKey, answer);
        }}
        onAnswersChange={updateAnswers}
        registerInputRef={registerInputRef}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {lookupFields.map((field) => renderField(field, true))}
      {group.config.addressSearch ? renderField(group.anchor) : null}
      {lookup.isFetching ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.text} />
          <Text style={styles.statusText}>{t('serviceForm.address.lookupLoading')}</Text>
        </View>
      ) : null}
      {lookupFailed && group.config.manualEntry ? (
        <Text style={styles.statusText}>{t('serviceForm.address.lookupFailed')}</Text>
      ) : null}
      {!showResolvedFields && group.config.manualEntry ? (
        <Button
          label={t('serviceForm.address.manualEntry')}
          variant="secondary"
          onPress={() => setManualEntryActive(true)}
        />
      ) : null}
      {showResolvedFields ? resolvedFields.map((field) => renderField(field)) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { ...typography.label, color: colors.textMuted },
});
