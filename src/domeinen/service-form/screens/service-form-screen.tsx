import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Service } from '@/domeinen/allocations';
import {
  ACTION_FEEDBACK_MESSAGE,
  ServiceDeclineSheet,
  useAllocations,
  useDeclineService,
  useProcessingExit,
  useServices,
} from '@/domeinen/allocations/ui';
import {
  PHOTO_PHASE,
  PHOTO_STATUS,
  photoPositionForRequirement,
  photoRequirementName,
  unmatchedLoadPhotos,
  type PhotoPhase,
} from '@/domeinen/photos';
import { usePhotoService } from '@/domeinen/photos/ui';
import { isRetryable } from '@/shared/api/errors';
import { Button } from '@/shared/ui/button';
import { confirm } from '@/shared/ui/confirm';
import { ScreenFooter } from '@/shared/ui/screen-footer';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { colors, spacing } from '@/shared/ui/theme';
import { base64ToBytes, isJpegBase64 } from '@/domeinen/signatures';
import { ReadonlyFieldSummary } from '../components/readonly-field-summary';
import { ServiceFieldRenderer } from '../components/service-field-renderer';
import { ServiceFormHeader } from '../components/service-form-header';
import { ServiceFormToolbar } from '../components/service-form-toolbar';
import { ServiceFormSection } from '../components/service-form-section';
import { ServiceFormVehicleRegistrationGroup } from '../components/service-form-vehicle-registration-group';
import { groupSectionFields } from '../domain/field-kind';
import { serviceFormLanguageCode, serviceFormPhaseForStatus } from '../domain/form-context';
import { resolveServiceFormLoadState } from '../domain/load-state';
import { needsPhotoConfirmation } from '../domain/photos-confirm';
import { partitionVehicleRegistrationFields } from '../domain/rdw-autofill';
import { normalizeServiceFormDefinition } from '../domain/schema';
import {
  isServiceFormDirty,
  selectQuickViewSections,
  selectServiceFormProgress,
} from '../domain/selectors';
import { hasAnySignature } from '../domain/signature';
import { buildUploadSignatureParams } from '../domain/signature-upload';
import { buildSignaturePostData, buildServicePostBody } from '../domain/submission';
import { validateVisibleServiceForm } from '../domain/validation';
import type { NormalizedServiceForm, ServiceFormField } from '../domain/types';
import {
  useFetchRdwInfo,
  useServiceFormDrafts,
  useServiceFormService,
  useSignaturesApi,
} from '../hooks/service-form-context';
import { useServiceDefinition } from '../hooks/use-service-definition';
import { useServiceForm } from '../hooks/use-service-form';
import type { ServiceFormDraft } from '../service/draft-storage';
import { createServiceFormDraft, hasServiceFormDraftProgress } from '../service/draft-storage';
import {
  ServiceFormStoreProvider,
  useServiceFormStore,
  useServiceFormStoreApi,
} from '../store/service-form-store-provider';

type ExitContext = {
  allocationId: string;
  serviceId: string;
  incidentId: string;
  allocationTypeCode?: number;
  services: readonly Service[];
};

type DraftGate = { status: 'loading' } | { status: 'ready'; draft: ServiceFormDraft | null };

const TERMS_URL = 'https://berging-mobiliteit.nl/';
const NO_PHOTO_REQUIREMENTS: readonly string[] = [];

/**
 * The processing form of one service: the schema from the synced reference data, filled in with
 * the service's current CRM values, for the phase its status is in. Sending it hands over to the
 * same exit flow as every other way out of processing (`useProcessingExit`).
 * `preview` shows the form read-only (old `previewMode` / `CheckStatus === 1`): no submit, no edits.
 */
export function ServiceFormScreen({
  allocationId,
  serviceId,
  preview = false,
}: {
  allocationId: string;
  serviceId: string;
  preview?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const drafts = useServiceFormDrafts();
  const { sections, isPending: allocationsPending } = useAllocations();
  const [active, pending] = sections;
  const allocation = [...active.data, ...pending.data].find(
    (item) => item.dn_allocationid === allocationId,
  );
  const incidentId = allocation?.incident.dn_incidentid ?? '';
  const servicesQuery = useServices(incidentId, allocation?.services ?? null);
  const services = servicesQuery.data ?? allocation?.services ?? [];
  const service = services.find((item) => item.dn_serviceid === serviceId);
  const { state, retry } = useServiceDefinition(service?.dn_servicetypecode ?? undefined);
  const pleaseSelectLabel = t('serviceForm.pleaseSelect');
  const languageCode = serviceFormLanguageCode(i18n.language);
  const phase = serviceFormPhaseForStatus(service?.statuscode);
  const definition = state.status === 'ready' ? state.definition : null;
  const [draftGate, setDraftGate] = useState<DraftGate>(() =>
    preview ? { status: 'ready', draft: null } : { status: 'loading' },
  );
  const loadState = resolveServiceFormLoadState({
    allocationsPending,
    allocationFound: allocation !== undefined,
    servicesPending: servicesQuery.isPending,
    serviceFound: service !== undefined,
    definitionStatus: state.status,
    draftPending: draftGate.status === 'loading',
  });

  const model = useMemo(
    () =>
      definition
        ? normalizeServiceFormDefinition(definition, {
            phase,
            languageCode,
            values: service ?? {},
            pleaseSelectLabel,
          })
        : null,
    [definition, languageCode, phase, pleaseSelectLabel, service],
  );

  useEffect(() => {
    if (preview) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const loaded = await drafts.load(allocationId, serviceId);
      if (cancelled) {
        return;
      }
      if (!hasServiceFormDraftProgress(loaded)) {
        setDraftGate({ status: 'ready', draft: null });
        return;
      }
      setDraftGate({ status: 'ready', draft: loaded });
    })();
    return () => {
      cancelled = true;
    };
  }, [allocationId, drafts, preview, serviceId]);

  if (loadState === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
        <Text style={styles.message}>{t('serviceForm.loading')}</Text>
      </View>
    );
  }

  if (loadState === 'not-found') {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{t('serviceForm.notFound')}</Text>
        <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  if (loadState !== 'ready' || !model || !allocation || !service) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          {loadState === 'failed' ? t('common.somethingWrong') : t('serviceForm.noDefinition')}
        </Text>
        <Button label={t('common.retry')} variant="secondary" onPress={retry} />
      </View>
    );
  }

  const firstSectionId = model.form.sections.find((section) => section.fields.length > 0)?.id;
  const draft = draftGate.status === 'ready' ? draftGate.draft : null;

  return (
    <ServiceFormStoreProvider
      key={`${model.form.serviceCode}:${model.form.phase}:${languageCode}:${draft?.timestamp ?? 0}`}
      initialAnswers={model.initialAnswers}
      initialExpandedSectionId={firstSectionId}
      requiresTermsAcceptance={model.form.requiresTermsAcceptance}
      persistedDraft={draft}
    >
      <ServiceFormBody
        form={model.form}
        loadPhotoRequirements={
          definition?.definition?.find((phase) => phase.phase === 1)?.photosMandatory ??
          NO_PHOTO_REQUIREMENTS
        }
        service={service}
        pleaseSelectLabel={pleaseSelectLabel}
        preview={preview}
        exitContext={{
          allocationId,
          serviceId,
          incidentId,
          allocationTypeCode: allocation.type,
          services,
        }}
      />
    </ServiceFormStoreProvider>
  );
}

function ServiceFormBody({
  form,
  loadPhotoRequirements,
  service,
  pleaseSelectLabel,
  preview,
  exitContext,
}: {
  form: NormalizedServiceForm;
  loadPhotoRequirements: readonly string[];
  service: Service;
  pleaseSelectLabel: string;
  preview: boolean;
  exitContext: ExitContext;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const serviceFormService = useServiceFormService();
  const signaturesApi = useSignaturesApi();
  const drafts = useServiceFormDrafts();
  const photoService = usePhotoService();
  const storeApi = useServiceFormStoreApi();
  const { exit } = useProcessingExit();
  const statusOverlay = useStatusOverlay();
  const decline = useDeclineService({
    ...exitContext,
    serviceTypeCode: service.dn_servicetypecode ?? undefined,
  });
  const {
    answers,
    errors,
    fields,
    visibility,
    visibleSections,
    progress,
    nextIncompleteField,
    requiredFieldOverrides,
    updateAnswer,
    updateAnswers,
    setFieldsRequired,
    blurField,
    validateForm,
  } = useServiceForm(form, pleaseSelectLabel);
  const fetchRdwInfo = useFetchRdwInfo();
  const expandedSections = useServiceFormStore((state) => state.expandedSections);
  const toggleSection = useServiceFormStore((state) => state.toggleSection);
  const expandSection = useServiceFormStore((state) => state.expandSection);
  const hideSignature = useServiceFormStore((state) => state.hideSignature);
  const noEmailConfirmation = useServiceFormStore((state) => state.noEmailConfirmation);
  const acceptedTermsAndConditions = useServiceFormStore(
    (state) => state.acceptedTermsAndConditions,
  );
  const termsAcceptanceRequired = useServiceFormStore((state) => state.termsAcceptanceRequired);
  const [submitting, setSubmitting] = useState(false);
  const [quickViewActive, setQuickViewActive] = useState(false);
  const [overviewActive, setOverviewActive] = useState(false);
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);
  const [photoCoverage, setPhotoCoverage] = useState<{
    required: string[];
    present: string[];
  } | null>(null);
  const allowingLeave = useRef(false);
  const readOnly = preview || overviewActive;
  const photosComplete =
    photoCoverage !== null &&
    !needsPhotoConfirmation(photoCoverage.required, photoCoverage.present);
  const displayedSections = useMemo(
    () =>
      quickViewActive && !readOnly
        ? selectQuickViewSections(visibleSections, visibility.visibleFieldIds, answers, {
            requiredFieldOverrides,
            hideSignature,
            noEmailConfirmation,
            focusedFieldId,
          })
        : visibleSections,
    [
      answers,
      focusedFieldId,
      hideSignature,
      noEmailConfirmation,
      quickViewActive,
      readOnly,
      requiredFieldOverrides,
      visibility.visibleFieldIds,
      visibleSections,
    ],
  );

  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const fieldRefs = useRef(new Map<string, View>());
  const pendingJump = useRef<string | null>(null);

  const loadPhotoCoverage = useCallback(async (): Promise<{
    required: string[];
    present: string[];
  }> => {
    const phase: PhotoPhase = form.phase === 2 ? PHOTO_PHASE.delivery : PHOTO_PHASE.load;
    const photos = await photoService.listByService(exitContext.serviceId);
    const currentPhotos = photos.filter(
      (photo) => photo.phase === phase && photo.status !== PHOTO_STATUS.failed,
    );
    const present = currentPhotos.map((photo) => photoRequirementName(photo.position));
    const required = [...form.photosMandatory];
    if (phase === PHOTO_PHASE.delivery) {
      const loadPhotos = photos.filter(
        (photo) => photo.phase === PHOTO_PHASE.load && photo.status !== PHOTO_STATUS.failed,
      );
      const loadFallback =
        loadPhotos.length === 0
          ? await photoService.listServerPhotos({
              allocationId: exitContext.allocationId,
              incidentId: exitContext.incidentId,
              serviceId: exitContext.serviceId,
              phase: PHOTO_PHASE.load,
            })
          : [];
      const loadPositions =
        loadPhotos.length > 0
          ? loadPhotos.map((photo) => photo.position)
          : loadFallback
              .filter((photo) => photo.phase === PHOTO_PHASE.load)
              .map((photo) => photo.position);
      const mandatoryLoadPositions = loadPhotoRequirements.map(photoPositionForRequirement);
      if (mandatoryLoadPositions.some((position) => position === null)) {
        throw new Error('Unknown required load photo position');
      }
      required.push(
        ...unmatchedLoadPhotos(
          loadPositions,
          mandatoryLoadPositions.filter((position) => position !== null),
        ).map(photoRequirementName),
      );
    }
    if (currentPhotos.length === 0 && needsPhotoConfirmation(required, present)) {
      const serverPhotos = await photoService.listServerPhotos({
        allocationId: exitContext.allocationId,
        incidentId: exitContext.incidentId,
        serviceId: exitContext.serviceId,
        phase,
      });
      present.push(
        ...serverPhotos
          .filter((photo) => photo.phase === phase)
          .map((photo) => photoRequirementName(photo.position)),
      );
    }
    return { required, present };
  }, [
    exitContext.allocationId,
    exitContext.incidentId,
    exitContext.serviceId,
    form.phase,
    form.photosMandatory,
    loadPhotoRequirements,
    photoService,
  ]);

  useEffect(() => {
    let active = true;
    const refreshPhotos = async (): Promise<void> => {
      try {
        const coverage = await loadPhotoCoverage();
        if (active) {
          setPhotoCoverage(coverage);
        }
      } catch {
        if (active) {
          setPhotoCoverage(null);
        }
      }
    };
    void refreshPhotos();
    const unsubscribe = navigation.addListener('focus', () => void refreshPhotos());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadPhotoCoverage, navigation]);

  useEffect(() => {
    if (preview) {
      return;
    }
    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event: {
        preventDefault(): void;
        data: { action: { type: string; payload?: object; source?: string; target?: string } };
      }) => {
        if (allowingLeave.current || submitting) {
          return;
        }
        const state = storeApi.getState();
        if (!isServiceFormDirty(state.initialAnswers, state.answers)) {
          return;
        }
        event.preventDefault();
        void (async () => {
          try {
            await drafts.save(
              exitContext.allocationId,
              exitContext.serviceId,
              createServiceFormDraft(state),
            );
            allowingLeave.current = true;
            navigation.dispatch(event.data.action);
          } catch {
            Alert.alert(t('common.somethingWrong'));
          }
        })();
      },
    );
    return unsubscribe;
  }, [
    drafts,
    exitContext.allocationId,
    exitContext.serviceId,
    navigation,
    preview,
    storeApi,
    submitting,
    t,
  ]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: preview
        ? () => null
        : () => (
            <ResetFormHeaderButton
              onPress={() => {
                void (async () => {
                  const accepted = await confirm({
                    title: t('serviceForm.reset.title'),
                    message: t('serviceForm.reset.message'),
                    confirmLabel: t('serviceForm.reset.action'),
                    cancelLabel: t('common.cancel'),
                    destructive: true,
                  });
                  if (!accepted) {
                    return;
                  }
                  try {
                    await drafts.clear(exitContext.allocationId, exitContext.serviceId);
                    storeApi.getState().reset();
                    setQuickViewActive(false);
                    setOverviewActive(false);
                  } catch {
                    Alert.alert(t('common.somethingWrong'));
                  }
                })();
              }}
            />
          ),
    });
  }, [drafts, exitContext.allocationId, exitContext.serviceId, navigation, preview, storeApi, t]);

  const scrollToField = (fieldId: string): void => {
    const node = fieldRefs.current.get(fieldId);
    const content = contentRef.current;
    if (!node || !content) {
      return;
    }
    node.measureLayout(content, (_x, y) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.md), animated: true });
    });
  };

  const jumpToField = (field: ServiceFormField | undefined): void => {
    if (!field) {
      return;
    }
    const section = visibleSections.find((candidate) =>
      candidate.fields.some((item) => item.id === field.id),
    );
    if (section && !expandedSections[section.id]) {
      pendingJump.current = field.id;
      expandSection(section.id);
      return;
    }
    scrollToField(field.id);
  };

  const handleFieldLayout = (fieldId: string): void => {
    if (pendingJump.current === fieldId) {
      pendingJump.current = null;
      scrollToField(fieldId);
    }
  };

  const baseExit = {
    ...exitContext,
    serviceTypeCode: service.dn_servicetypecode ?? undefined,
  };

  const clearDraftAndLeave = async (): Promise<void> => {
    await drafts.clear(exitContext.allocationId, exitContext.serviceId);
    allowingLeave.current = true;
  };

  const submit = async (): Promise<void> => {
    if (submitting) {
      return;
    }
    if (!validateForm()) {
      const invalid = validateVisibleServiceForm(
        fields,
        visibility.visibleFieldIds,
        answers,
        requiredFieldOverrides,
        hideSignature,
        noEmailConfirmation,
      );
      jumpToField(fields.find((field) => invalid[field.key] !== undefined));
      return;
    }

    let currentPhotoCoverage: { required: string[]; present: string[] };
    try {
      currentPhotoCoverage = await loadPhotoCoverage();
    } catch {
      Alert.alert(t('common.somethingWrong'));
      return;
    }
    if (needsPhotoConfirmation(currentPhotoCoverage.required, currentPhotoCoverage.present)) {
      Alert.alert(t('serviceForm.photos.missingTitle'), t('serviceForm.photos.missingMessage'));
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]/photos',
        params: { id: exitContext.allocationId, serviceId: exitContext.serviceId },
      });
      return;
    }

    const body = buildServicePostBody(fields, visibility.visibleFieldIds, answers, form.phase, {
      pleaseSelectLabel,
      hideSignature,
      noEmailConfirmation,
    });
    if (termsAcceptanceRequired && !acceptedTermsAndConditions) {
      Alert.alert(t('serviceForm.signature.termsRequired'));
      return;
    }
    setSubmitting(true);
    let shouldExit = false;
    let wasBlocked = false;
    try {
      await statusOverlay.run(t('feedback.processing.submitService'), async () => {
        try {
          const signatureData = buildSignaturePostData(
            fields,
            visibility.visibleFieldIds,
            answers,
            hideSignature,
            noEmailConfirmation,
            form.phase,
          );
          if (hasAnySignature(signatureData)) {
            const upload = buildUploadSignatureParams({
              incidentId: exitContext.incidentId,
              serviceId: exitContext.serviceId,
              signatureData,
            });
            if (!isJpegBase64(upload.signatureData)) {
              throw new Error('Signature image must be JPEG');
            }
            await signaturesApi.upload({
              incidentId: upload.incidentId,
              serviceId: upload.serviceId,
              name: upload.name,
              email: upload.email,
              phase: upload.phase,
              signatureType: upload.signatureType,
              fileBytes: base64ToBytes(upload.signatureData),
            });
          }
          const result = await serviceFormService.submit({
            serviceId: exitContext.serviceId,
            statuscode: service.statuscode,
            body,
          });
          if (result.kind === 'blocked') {
            wasBlocked = true;
            shouldExit = true;
            await clearDraftAndLeave();
            return { tone: 'none' as const };
          }
          await clearDraftAndLeave();
          shouldExit = true;
          return {
            tone: 'success' as const,
            message: t(ACTION_FEEDBACK_MESSAGE.serviceSubmitted),
          };
        } catch (error) {
          setSubmitting(false);
          return {
            tone: 'error' as const,
            message: isRetryable(error) ? t('common.offline') : t('serviceForm.submitFailed'),
            retry: () => {
              void submit();
            },
          };
        }
      });
      if (wasBlocked) {
        Alert.alert(t('serviceForm.submitBlocked'));
        exit({ ...baseExit, trigger: 'blocked' });
        return;
      }
      if (shouldExit) {
        exit({
          ...baseExit,
          trigger: 'submit',
          currentStatuscode: service.statuscode,
          postedBody: body,
        });
      }
    } finally {
      if (!shouldExit) {
        setSubmitting(false);
      }
    }
  };

  const confirmDecline = async (): Promise<void> => {
    await clearDraftAndLeave();
    await decline.confirm();
  };

  const ready = progress.remaining === 0;
  const details = [service.dn_servicenumber, service.dn_concatlicenseplate].filter(
    (value): value is string => typeof value === 'string' && value !== '',
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={readOnly ? ['bottom'] : []}>
      <ServiceFormHeader
        serviceName={form.serviceName}
        phaseName={form.phaseName}
        progress={progress}
        details={details}
      />
      <ServiceFormToolbar
        actions={
          preview
            ? undefined
            : {
                onToggleQuickView: () => {
                  setOverviewActive(false);
                  setQuickViewActive((active) => !active);
                },
                onOpenPhotos: () =>
                  router.push({
                    pathname: '/allocations/[id]/services/[serviceId]/photos',
                    params: {
                      id: exitContext.allocationId,
                      serviceId: exitContext.serviceId,
                    },
                  }),
                onToggleOverview: () => {
                  setQuickViewActive(false);
                  setOverviewActive((active) => !active);
                },
                onOpenTerms: () =>
                  void Linking.openURL(TERMS_URL).catch(() =>
                    Alert.alert(t('common.somethingWrong')),
                  ),
                onOpenDecline: decline.open,
                quickViewActive,
                photosComplete,
                overviewActive,
              }
        }
      />
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" bounces={false}>
        <View ref={contentRef} collapsable={false}>
          <View style={styles.sections}>
            {quickViewActive && displayedSections.length === 0 ? (
              <Text style={styles.quickComplete}>{t('serviceForm.actions.quickViewComplete')}</Text>
            ) : null}
            {displayedSections.map((section) => {
              const sectionProgress = selectServiceFormProgress(
                section.fields,
                visibility.visibleFieldIds,
                answers,
                { requiredFieldOverrides, hideSignature, noEmailConfirmation },
              );
              return (
                <ServiceFormSection
                  key={section.id}
                  title={section.title}
                  expanded={Boolean(expandedSections[section.id])}
                  completed={sectionProgress.completed}
                  total={sectionProgress.total}
                  errorCount={
                    readOnly ? 0 : section.fields.filter((field) => errors[field.key]).length
                  }
                  onToggle={() => toggleSection(section.id)}
                >
                  {(() => {
                    const { vehicleFields, otherFields } = partitionVehicleRegistrationFields(
                      section.fields,
                    );
                    return (
                      <>
                        {vehicleFields.length > 0 ? (
                          <ServiceFormVehicleRegistrationGroup
                            fields={vehicleFields}
                            answers={answers}
                            errors={errors}
                            pleaseSelectLabel={pleaseSelectLabel}
                            readOnly={readOnly}
                            fetchRdwInfo={fetchRdwInfo}
                            updateAnswer={updateAnswer}
                            updateAnswers={updateAnswers}
                            setFieldsRequired={setFieldsRequired}
                            onFocus={(field) => setFocusedFieldId(field.id)}
                            onBlur={(field) => {
                              setFocusedFieldId(null);
                              blurField(field);
                            }}
                            registerFieldRef={(fieldId, node) => {
                              if (node) {
                                fieldRefs.current.set(fieldId, node);
                              } else {
                                fieldRefs.current.delete(fieldId);
                              }
                            }}
                            onFieldLayout={handleFieldLayout}
                          />
                        ) : null}
                        {groupSectionFields(otherFields, { readonly: readOnly }).map((group) =>
                          group.kind === 'readonly' ? (
                            <ReadonlyFieldSummary
                              key={group.fields.map((field) => field.id).join(':')}
                              fields={group.fields}
                              answers={answers}
                            />
                          ) : (
                            <View
                              key={group.field.id}
                              collapsable={false}
                              ref={(node) => {
                                if (node) {
                                  fieldRefs.current.set(group.field.id, node);
                                } else {
                                  fieldRefs.current.delete(group.field.id);
                                }
                              }}
                              onLayout={() => handleFieldLayout(group.field.id)}
                            >
                              <ServiceFieldRenderer
                                field={group.field}
                                answer={answers[group.field.key]}
                                error={errors[group.field.key]}
                                dependencyAnswer={
                                  group.field.dependencies?.required
                                    ? answers[group.field.dependencies.required]
                                    : undefined
                                }
                                pleaseSelectLabel={pleaseSelectLabel}
                                onChange={updateAnswer}
                                onAnswersChange={updateAnswers}
                                onFocus={(field) => setFocusedFieldId(field.id)}
                                onBlur={(field) => {
                                  setFocusedFieldId(null);
                                  blurField(field);
                                }}
                              />
                            </View>
                          ),
                        )}
                      </>
                    );
                  })()}
                </ServiceFormSection>
              );
            })}
          </View>
        </View>
      </ScrollView>
      {!readOnly ? (
        <ScreenFooter>
          {ready ? <Text style={styles.ready}>{t('serviceForm.readyToSubmit')}</Text> : null}
          {ready ? (
            <Button
              label={t('serviceForm.submit')}
              onPress={() => void submit()}
              loading={submitting}
            />
          ) : (
            <Button
              label={t('serviceForm.next')}
              variant="secondary"
              disabled={!nextIncompleteField}
              onPress={() => jumpToField(nextIncompleteField ?? undefined)}
            />
          )}
        </ScreenFooter>
      ) : null}
      {!preview ? (
        <ServiceDeclineSheet
          state={decline.state}
          onClose={decline.close}
          onSelect={decline.select}
          onBack={decline.back}
          onConfirm={() => void confirmDecline()}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  sections: { padding: spacing.md, gap: spacing.md },
  ready: { color: colors.success, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  quickComplete: { color: colors.success, textAlign: 'center', fontWeight: '600' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  message: { color: colors.text, fontSize: 15, textAlign: 'center' },
  headerButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  headerButtonPressed: { opacity: 0.6 },
});

function ResetFormHeaderButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('serviceForm.reset.accessibilityLabel')}
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
      hitSlop={spacing.sm}
    >
      <Ionicons name="refresh" size={24} color={colors.brandText} />
    </Pressable>
  );
}
