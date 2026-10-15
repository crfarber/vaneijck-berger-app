import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View, type TextInput } from 'react-native';
import { Button } from '@/shared/ui/button';
import { colors, radius, spacing, type as typography } from '@/shared/ui/theme';
import { confirm } from '@/shared/ui/confirm';
import {
  buildClearedAddressEntryAnswers,
  getAddressEntryLookupFields,
  getAddressEntryResolvedFields,
  hasResolvedAddressComponentAnswers,
  isCompactLookupActionDisabled,
  isPostalAddressLookupQueryEnabled,
  resolveCompactAddressSummaryDisplay,
  shouldOfferForeignLocationEntry,
  shouldOfferNonCompactManualEntry,
  shouldShowCompactLookupAction,
  shouldShowResolvedAddressFields,
  visibleCompactAddressFields,
  type AddressEntryGroup,
} from '../domain/address-entry';
import {
  buildAddressPlaceAnswers,
  resolveCountryAnswer,
  withCountryInAddressSummary,
  type CountryLookupRow,
} from '../domain/address-place-selection';
import {
  isPostalAddressLookupReady,
  normalizeDutchPostalCode,
} from '../domain/postal-address-lookup';
import type {
  PostalAddressLookupInput,
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormError,
  ServiceFormField,
} from '../domain/types';
import {
  useLookupPostalAddress,
  useServiceFormLogger,
  useServiceFormService,
} from '../hooks/service-form-context';
import { DevGroupAnswersButton } from './dev-group-answers-button';
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
  const logger = useServiceFormLogger();
  const service = useServiceFormService();
  const lookupPostalAddress = useLookupPostalAddress();
  const [manualEntryActive, setManualEntryActive] = useState(false);
  const [foreignLocationActive, setForeignLocationActive] = useState(false);
  const [requestedLookupKey, setRequestedLookupKey] = useState<string | null>(null);
  const [appliedLookupKeyForView, setAppliedLookupKeyForView] = useState<string | null>(null);
  const [appliedAddressSummary, setAppliedAddressSummary] = useState<string | null>(null);
  const appliedLookupKey = useRef<string | null>(null);
  const pendingLookupKey = useRef<string | null>(null);
  const loggedLookupErrorKey = useRef<string | null>(null);
  const lookupFields = useMemo(() => getAddressEntryLookupFields(group), [group]);
  const resolvedFields = useMemo(() => getAddressEntryResolvedFields(group), [group]);
  const debugFields = useMemo(() => [group.anchor, ...group.orderedFields], [group]);
  const manuallyEditableResolvedFields = useMemo(
    () =>
      group.config.allowForeignManual
        ? resolvedFields
        : resolvedFields.filter((field) => field.key !== group.mapping.country),
    [group.config.allowForeignManual, group.mapping.country, resolvedFields],
  );
  const postalCode = answerText(answers[group.mapping.postalcode ?? '']);
  const houseNumber = answerText(answers[group.mapping.houseno ?? '']);
  const houseNumberAddition = answerText(answers[group.mapping.housenoadd ?? '']);
  const normalizedPostalCode = normalizeDutchPostalCode(postalCode);
  const normalizedHouseNumber = /^\d+$/.test(houseNumber) ? houseNumber : null;
  const lookupReady = isPostalAddressLookupReady(postalCode, houseNumber);
  const lookupInput: PostalAddressLookupInput = { postalCode, houseNumber, houseNumberAddition };
  const lookupKey = `${normalizedPostalCode ?? ''}|${normalizedHouseNumber ?? ''}|${houseNumberAddition}`;
  const hasResolvedAnswers = hasResolvedAddressComponentAnswers(group, answers);
  const lookupEnabled = isPostalAddressLookupQueryEnabled({
    readOnly,
    foreignLocationActive,
    postcodeHouseNumberLookup: group.config.postcodeHouseNumberLookup,
    hasLookupCapability: Boolean(lookupPostalAddress),
    lookupReady,
    isCompactAddressGroup: group.isCompactAddressGroup,
    requestedLookupKey,
    lookupKey,
    hasResolvedAnswers,
    manualEntryActive,
  });
  const lookup = useQuery({
    queryKey: ['service-form', 'postal-address', group.anchor.id, lookupKey],
    queryFn: () => (lookupPostalAddress ? lookupPostalAddress(lookupInput) : null),
    enabled: lookupEnabled,
    retry: false,
  });
  const lookupUnavailable = group.config.postcodeHouseNumberLookup && !lookupPostalAddress;
  const lookupFailed = Boolean(
    !foreignLocationActive &&
    (!group.isCompactAddressGroup || lookupReady) &&
    (lookupUnavailable || lookup.isError || (lookup.isFetched && lookup.data === null)),
  );
  const showResolvedFields = shouldShowResolvedAddressFields(group, answers, {
    manualEntryActive,
    lookupFailed,
    lookupReady,
    lookupApplied: appliedLookupKeyForView === lookupKey,
    foreignLocationActive,
  });
  const addressSummary = resolveCompactAddressSummaryDisplay(group, answers, {
    foreignLocationActive,
    appliedAddressSummary,
  });
  const canOfferForeignLocation = shouldOfferForeignLocationEntry(group, foreignLocationActive);
  const canOfferManualEntry = shouldOfferNonCompactManualEntry(group);
  const compactVisibleFields = visibleCompactAddressFields(group, foreignLocationActive);
  const showCompactLookupAction = shouldShowCompactLookupAction({
    hasResolvedAnswers,
    appliedAddressSummary,
  });
  const hasAppliedCompactAddress = !showCompactLookupAction && Boolean(addressSummary);

  const resetAppliedCompactAddress = (): void => {
    appliedLookupKey.current = null;
    setAppliedLookupKeyForView(null);
    setRequestedLookupKey(null);
    setAppliedAddressSummary(null);
    setManualEntryActive(false);
    updateAnswers(buildClearedAddressEntryAnswers(group));
  };

  const openForeignLocation = (): void => {
    appliedLookupKey.current = null;
    setAppliedLookupKeyForView(null);
    setRequestedLookupKey(null);
    setAppliedAddressSummary(null);
    setManualEntryActive(false);
    setForeignLocationActive(true);
  };

  useEffect(() => {
    const address = lookup.data;
    if (
      foreignLocationActive ||
      (group.isCompactAddressGroup && manualEntryActive) ||
      (group.isCompactAddressGroup && requestedLookupKey !== lookupKey) ||
      lookup.isFetching ||
      !address ||
      appliedLookupKey.current === lookupKey ||
      pendingLookupKey.current === lookupKey
    ) {
      return;
    }
    pendingLookupKey.current = lookupKey;
    void (async () => {
      const accepted =
        !group.config.confirmAddress ||
        (await confirm({
          title: t('serviceForm.address.lookupConfirmTitle'),
          message: address.formatted,
          confirmLabel: t('serviceForm.address.lookupConfirmApply'),
          cancelLabel: group.config.manualEntry
            ? t('serviceForm.address.manualEntry')
            : t('common.cancel'),
        }));
      // Always honour the user's choice: the confirm dialog may outlive this effect.
      if (pendingLookupKey.current === lookupKey) {
        pendingLookupKey.current = null;
      }
      if (!accepted) {
        if (group.isCompactAddressGroup) {
          setForeignLocationActive(true);
        } else {
          setManualEntryActive(true);
        }
        return;
      }
      appliedLookupKey.current = lookupKey;
      setAppliedLookupKeyForView(lookupKey);
      setAppliedAddressSummary(address.formatted);
      const countries = (await service.loadTable('dn_country')) as CountryLookupRow[];
      updateAnswers(buildAddressPlaceAnswers(group.anchor.key, address, group.mapping, countries));
      const countryAnswer = resolveCountryAnswer(address.countryIso2 || undefined, countries);
      setAppliedAddressSummary(
        withCountryInAddressSummary(address.formatted, countryAnswer?.displayValue as string),
      );
    })();
  }, [
    foreignLocationActive,
    group.anchor.key,
    group.config.confirmAddress,
    group.config.manualEntry,
    group.isCompactAddressGroup,
    group.mapping,
    lookup.data,
    lookup.isFetching,
    lookupKey,
    requestedLookupKey,
    service,
    t,
    manualEntryActive,
    updateAnswers,
  ]);

  useEffect(() => {
    if (foreignLocationActive || !lookup.isError || loggedLookupErrorKey.current === lookupKey) {
      return;
    }
    loggedLookupErrorKey.current = lookupKey;
    logger.warn('serviceForm', 'Postal address lookup failed', {
      errorType: lookup.error instanceof Error ? lookup.error.name : 'UnknownError',
    });
  }, [foreignLocationActive, logger, lookup.error, lookup.isError, lookupKey]);

  const debugButton = <DevGroupAnswersButton answers={answers} fields={debugFields} />;

  if (readOnly) {
    return (
      <View style={styles.container}>
        <ReadonlyFieldSummary fields={[group.anchor, ...group.orderedFields]} answers={answers} />
        {debugButton}
      </View>
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
            setRequestedLookupKey(null);
            setAppliedLookupKeyForView(null);
            setAppliedAddressSummary(null);
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

  if (foreignLocationActive) {
    return (
      <View style={styles.container}>
        {compactVisibleFields.map((field) => renderField(field))}
        <View style={styles.modeLink}>
          <Button
            label={t('serviceForm.address.useQuickSearch')}
            variant="text"
            onPress={() => {
              appliedLookupKey.current = null;
              setAppliedLookupKeyForView(null);
              setRequestedLookupKey(null);
              setAppliedAddressSummary(null);
              setManualEntryActive(false);
              setForeignLocationActive(false);
              updateAnswers(buildClearedAddressEntryAnswers(group));
            }}
          />
        </View>
        {debugButton}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {group.isCompactAddressGroup ? (
        <View style={styles.lookupRow}>
          {compactVisibleFields.map((field) => (
            <View key={field.id} style={styles.lookupField}>
              {renderField(field, true)}
            </View>
          ))}
        </View>
      ) : (
        lookupFields.map((field) => renderField(field, true))
      )}
      {group.config.addressSearch ? renderField(group.anchor) : null}
      {group.isCompactAddressGroup &&
      group.config.postcodeHouseNumberLookup &&
      showCompactLookupAction ? (
        <Button
          label={t('serviceForm.address.lookupAction')}
          variant="secondary"
          disabled={isCompactLookupActionDisabled({
            lookupReady,
            hasLookupCapability: Boolean(lookupPostalAddress),
            isFetching: lookup.isFetching,
          })}
          onPress={() => {
            setManualEntryActive(false);
            setRequestedLookupKey(lookupKey);
            if (lookup.isFetched) {
              void lookup.refetch();
            }
          }}
        />
      ) : null}
      {addressSummary ? (
        <Text
          style={styles.addressSummary}
          accessibilityLiveRegion="polite"
          numberOfLines={0}
          ellipsizeMode="tail"
        >
          {addressSummary}
        </Text>
      ) : null}
      {hasAppliedCompactAddress && canOfferForeignLocation ? (
        <View style={styles.modeLink}>
          <Button
            label={t('serviceForm.address.reset')}
            variant="text"
            onPress={resetAppliedCompactAddress}
          />
        </View>
      ) : null}
      {!hasAppliedCompactAddress && canOfferForeignLocation ? (
        <View style={styles.modeLink}>
          <Button
            label={t('serviceForm.address.foreignLocation')}
            variant="text"
            onPress={openForeignLocation}
          />
        </View>
      ) : null}
      {lookup.isFetching ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.text} />
          <Text style={styles.statusText}>{t('serviceForm.address.lookupLoading')}</Text>
        </View>
      ) : null}
      {lookupFailed && group.config.manualEntry ? (
        <Text style={styles.statusText}>{t('serviceForm.address.lookupFailed')}</Text>
      ) : null}
      {!showResolvedFields && canOfferManualEntry && !lookup.data ? (
        <View style={styles.modeLink}>
          <Button
            label={t('serviceForm.address.manualEntry')}
            variant="text"
            onPress={() => setManualEntryActive(true)}
          />
        </View>
      ) : null}
      {showResolvedFields
        ? manuallyEditableResolvedFields.map((field) => renderField(field))
        : null}
      {debugButton}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  lookupRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  lookupField: { flex: 1, minWidth: 0 },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { ...typography.label, color: colors.textMuted },
  addressSummary: {
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
  actionRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  actionButton: { flex: 0.5, minWidth: 0 },
  modeLink: { flex: 1, alignSelf: 'flex-end' },
  modeLinkText: {
    color: colors.brandAction,
    textDecorationLine: 'underline',
    fontSize: 14,
  },
});
