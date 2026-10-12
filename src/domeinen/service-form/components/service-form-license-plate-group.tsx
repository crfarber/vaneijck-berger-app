import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { isDutchLicensePlate, normalizeLicensePlate } from '@/domeinen/allocation-unit';
import { NumberPlate } from '@/domeinen/allocation-unit/ui';
import { Button } from '@/shared/ui/button';
import { confirm } from '@/shared/ui/confirm';
import { colors, spacing, type as typography } from '@/shared/ui/theme';
import {
  answerText,
  buildClearedLicensePlateAnswers,
  buildLicensePlateSummary,
  initialLicensePlateState,
  LicensePlatePhase,
  nextLicensePlateState,
  shouldConfirmReported,
  shouldShowManualVehicleFields,
  shouldShowRdwSummary,
  type LicensePlateEntryGroup,
  type LicensePlateUiState,
} from '../domain/license-plate-entry';
import { rdwReadonlyDisplay } from '../domain/rdw-autofill';
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

export type ServiceFormLicensePlateGroupProps = {
  group: LicensePlateEntryGroup;
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
 * Compact license-plate / RDW flow driven by `license_plate_group` metadata.
 * Confirm reported plate → lookup → summary; only ask for brand/type when needed.
 */
export function ServiceFormLicensePlateGroup({
  group,
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
}: ServiceFormLicensePlateGroupProps) {
  const { t } = useTranslation();
  const mapping = group.mapping;
  const foundPlateKey = mapping.foundPlate ?? group.anchor.key;
  const reportedPlateKey = mapping.reportedPlate;
  const fieldByKey = useMemo(
    () => new Map(group.orderedFields.map((field) => [field.key, field])),
    [group.orderedFields],
  );
  const fieldKeys = useMemo(
    () => new Set(group.orderedFields.map((field) => field.key)),
    [group.orderedFields],
  );

  const reportedPlate = reportedPlateKey ? answerText(answers[reportedPlateKey]) || null : null;
  const foundPlateValue = answerText(answers[foundPlateKey]);

  const [uiState, setUiState] = useState<LicensePlateUiState>(() =>
    initialLicensePlateState(reportedPlate, foundPlateValue),
  );
  const reportedSyncKey = reportedPlate ?? '';
  const [syncedReportedKey, setSyncedReportedKey] = useState(reportedSyncKey);
  if (syncedReportedKey !== reportedSyncKey) {
    setSyncedReportedKey(reportedSyncKey);
    setUiState(initialLicensePlateState(reportedPlate, foundPlateValue));
  }
  const pendingConfirmPlate = useRef<string | null>(null);
  const getAnswers = useCallback(() => answers, [answers]);

  const dispatch = useCallback((event: Parameters<typeof nextLicensePlateState>[1]) => {
    setUiState((current) => nextLicensePlateState(current, event));
  }, []);

  const clearDerivedAnswers = useCallback(() => {
    updateAnswers(
      buildClearedLicensePlateAnswers(
        mapping,
        ['country', 'rdwBrand', 'rdwType', 'rdwColor', 'brand', 'type'],
        pleaseSelectLabel,
      ),
    );
  }, [mapping, pleaseSelectLabel, updateAnswers]);

  const writeFoundPlate = useCallback(
    (plate: string) => {
      const current = answers[foundPlateKey] ?? { value: '', displayValue: '' };
      updateAnswers({
        [foundPlateKey]: { ...current, value: plate, displayValue: plate },
      });
    },
    [answers, foundPlateKey, updateAnswers],
  );

  const { rdwInfo, rdwLookupFailed, handlePlateChange, loadRdwForPlate } =
    useRdwVehicleRegistration({
      pleaseSelectLabel,
      fetchRdwInfo: readOnly ? undefined : fetchRdwInfo,
      fieldKeys,
      getAnswers,
      updateAnswers,
      setFieldsRequired,
      mapping,
      onLookupResult: (result) => {
        if (result.failed) {
          dispatch({ type: 'lookupFailed' });
          return;
        }
        if (!result.info) {
          return;
        }
        if (group.config.confirmVehicle && pendingConfirmPlate.current !== result.plate) {
          pendingConfirmPlate.current = result.plate;
          const message = [result.info.model, result.info.tradeName, result.info.primaryColor]
            .filter((part) => Boolean(part?.trim()))
            .join(', ');
          void (async () => {
            const accepted = await confirm({
              title: t('serviceForm.licensePlate.confirmTitle'),
              message: message || result.plate,
              confirmLabel: t('serviceForm.licensePlate.confirmApply'),
              cancelLabel: group.config.allowManual
                ? t('serviceForm.licensePlate.notCorrect')
                : t('common.cancel'),
            });
            if (pendingConfirmPlate.current === result.plate) {
              pendingConfirmPlate.current = null;
            }
            if (!accepted) {
              dispatch({ type: 'confirmVehicleRejected' });
              return;
            }
            dispatch({
              type: 'confirmVehicleAccepted',
              typeMatched: result.typeMatched,
            });
          })();
          return;
        }
        dispatch({
          type: 'lookupSucceeded',
          typeMatched: result.typeMatched,
        });
      },
    });

  const acceptReported = (): void => {
    if (!reportedPlate) {
      return;
    }
    writeFoundPlate(reportedPlate);
    dispatch({ type: 'acceptReported' });
    if (isDutchLicensePlate(normalizeLicensePlate(reportedPlate))) {
      dispatch({ type: 'lookupStarted' });
      loadRdwForPlate(reportedPlate);
    }
  };

  const rejectReported = (): void => {
    writeFoundPlate('');
    clearDerivedAnswers();
    dispatch({ type: 'rejectReported' });
  };

  const openForeign = (): void => {
    clearDerivedAnswers();
    dispatch({ type: 'openForeign' });
  };

  const resetGroup = (): void => {
    pendingConfirmPlate.current = null;
    writeFoundPlate('');
    clearDerivedAnswers();
    dispatch({ type: 'reset' });
  };

  const onFoundPlateChange = (value: string): void => {
    const normalized = normalizeLicensePlate(value);
    dispatch({
      type: 'plateChanged',
      plate: value,
      isDutch: isDutchLicensePlate(normalized),
    });
    if (uiState.phase === LicensePlatePhase.Foreign) {
      writeFoundPlate(value);
      return;
    }
    if (isDutchLicensePlate(normalized)) {
      dispatch({ type: 'lookupStarted' });
    }
    handlePlateChange(value);
  };

  const foundField = fieldByKey.get(foundPlateKey);
  const brandField = mapping.brand ? fieldByKey.get(mapping.brand) : undefined;
  const typeField = mapping.type ? fieldByKey.get(mapping.type) : undefined;
  const countryField = mapping.country ? fieldByKey.get(mapping.country) : undefined;

  const showManual = shouldShowManualVehicleFields(uiState);
  const showSummary = shouldShowRdwSummary(uiState) && Boolean(rdwInfo);
  const showConfirm = shouldConfirmReported(uiState);
  const summaryText = buildLicensePlateSummary(mapping, answers, {
    brand: rdwInfo?.model,
    type: rdwInfo?.tradeName,
    color: rdwInfo?.primaryColor,
  });

  if (readOnly) {
    const displayAnswers: ServiceFormAnswers = { ...answers };
    for (const field of group.orderedFields) {
      const overlay = rdwReadonlyDisplay(field.key, rdwInfo, mapping);
      if (overlay !== undefined) {
        displayAnswers[field.key] = { value: overlay, displayValue: overlay };
      }
    }
    return <ReadonlyFieldSummary fields={group.orderedFields} answers={displayAnswers} />;
  }

  const renderField = (field: ServiceFormField | undefined) => {
    if (!field) {
      return null;
    }
    return (
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
          onChange={updateAnswer}
          registerInputRef={registerInputRef}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {reportedPlate ? (
        <View style={styles.reportedBlock}>
          <Text style={styles.label}>{t('serviceForm.licensePlate.reportedLabel')}</Text>
          <NumberPlate plateNumber={reportedPlate} />
        </View>
      ) : null}

      {showConfirm ? (
        <View style={styles.actionRow}>
          <View style={styles.actionButton}>
            <Button label={t('serviceForm.licensePlate.acceptReported')} onPress={acceptReported} />
          </View>
          <View style={styles.actionButton}>
            <Button
              label={t('serviceForm.licensePlate.rejectReported')}
              variant="secondary"
              onPress={rejectReported}
            />
          </View>
        </View>
      ) : (
        <>
          {foundField ? (
            <View
              collapsable={false}
              ref={(node) => registerFieldRef?.(foundField.id, node)}
              onLayout={() => onFieldLayout?.(foundField.id)}
            >
              <Text style={styles.label}>{t('serviceForm.licensePlate.foundLabel')}</Text>
              <NumberPlate
                plateNumber={foundPlateValue}
                editable
                onChangeText={onFoundPlateChange}
                onBlur={() => onBlur(foundField)}
                accessibilityLabel={t('serviceForm.licensePlate.foundLabel')}
              />
            </View>
          ) : null}

          {uiState.phase === LicensePlatePhase.LookingUp ? (
            <View style={styles.status} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.text} />
              <Text style={styles.statusText}>{t('serviceForm.licensePlate.lookupLoading')}</Text>
            </View>
          ) : null}

          {showSummary && summaryText ? (
            <>
              <Text style={styles.summary} accessibilityLiveRegion="polite">
                {summaryText}
              </Text>
              {group.config.allowManual ? (
                <Pressable
                  onPress={() => dispatch({ type: 'openManual' })}
                  style={styles.link}
                  accessibilityRole="button"
                >
                  <Text style={styles.linkText}>{t('serviceForm.licensePlate.notCorrect')}</Text>
                </Pressable>
              ) : null}
              <View style={styles.modeLink}>
                <Button
                  label={t('serviceForm.licensePlate.reset')}
                  variant="text"
                  onPress={resetGroup}
                />
              </View>
            </>
          ) : null}

          {rdwLookupFailed || uiState.phase === LicensePlatePhase.Manual ? (
            <Text style={styles.statusText}>{t('serviceForm.licensePlate.lookupFailed')}</Text>
          ) : null}

          {showManual ? (
            <>
              {uiState.phase === LicensePlatePhase.Foreign || rdwLookupFailed
                ? renderField(countryField)
                : null}
              {renderField(brandField)}
              {uiState.showTypeGap ||
              uiState.phase === LicensePlatePhase.Manual ||
              uiState.phase === LicensePlatePhase.Foreign
                ? renderField(typeField)
                : null}
            </>
          ) : null}

          {!showSummary &&
          group.config.allowForeignManual &&
          uiState.phase !== LicensePlatePhase.Foreign ? (
            <View style={styles.modeLink}>
              <Button
                label={t('serviceForm.licensePlate.foreignPlate')}
                variant="text"
                onPress={openForeign}
              />
            </View>
          ) : null}

          {uiState.phase === LicensePlatePhase.Foreign ? (
            <View style={styles.modeLink}>
              <Button
                label={t('serviceForm.licensePlate.useQuickSearch')}
                variant="text"
                onPress={resetGroup}
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  reportedBlock: { gap: spacing.xs },
  label: { ...typography.label, color: colors.textMuted },
  actionRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  actionButton: { flex: 1, minWidth: 0 },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { ...typography.label, color: colors.textMuted },
  summary: { ...typography.body, color: colors.textMuted },
  link: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  linkText: {
    color: colors.brandAction,
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  modeLink: { alignSelf: 'flex-end' },
});
