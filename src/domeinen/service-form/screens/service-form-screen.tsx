import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canReturnToDispatch, type Service } from '@/domeinen/allocations';
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
  deliveryPhotoRequirements,
  photoPositionForRequirement,
  photoRequirementName,
  reconcileHistoryPositions,
  type PhotoPhase,
} from '@/domeinen/photos';
import { usePhotoService } from '@/domeinen/photos/ui';
import { isRetryable } from '@/shared/api/errors';
import { Button } from '@/shared/ui/button';
import { useFeedback } from '@/shared/ui/toast-host';
import { confirm } from '@/shared/ui/confirm';
import { ScreenFooter } from '@/shared/ui/screen-footer';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { colors, spacing } from '@/shared/ui/theme';
import { base64ToBytes, isJpegBase64 } from '@/domeinen/signatures';
import { ReadonlyFieldSummary } from '../components/readonly-field-summary';
import { ServiceFieldRenderer } from '../components/service-field-renderer';
import { ServiceFormAddressGroup } from '../components/service-form-address-group';
import { ServiceFormHeader } from '../components/service-form-header';
import { ServiceFormToolbar } from '../components/service-form-toolbar';
import { useServiceFormToolbarScroll } from '../components/use-service-form-toolbar-scroll';
import {
  ServiceFormSectionBody,
  ServiceFormSectionHeader,
  serviceFormSectionHeaderFallbackHeight,
} from '../components/service-form-section';
import { ServiceFormLicensePlateGroup } from '../components/service-form-license-plate-group';
import { ServiceFormVehicleRegistrationGroup } from '../components/service-form-vehicle-registration-group';
import { buildAddressEntrySectionRenderItems } from '../domain/address-entry';
import { groupSectionFields } from '../domain/field-kind';
import {
  phaseNumbersFromDefinition,
  serviceFormLanguageCode,
  serviceFormPhaseForStatus,
} from '../domain/form-context';
import { findLicensePlateGroupInFields } from '../domain/license-plate-entry';
import { resolveServiceFormLoadState } from '../domain/load-state';
import { areServicePhotosUploaded, needsPhotoConfirmation } from '../domain/photos-confirm';
import { partitionVehicleRegistrationFields } from '../domain/rdw-autofill';
import { normalizeServiceFormDefinition } from '../domain/schema';
import {
  scrollOffsetBelowSectionHeader,
  serviceFormStickyHeaderIndices,
} from '../domain/section-scroll';
import { createServiceFormScenario } from '../domain/scenario-export';
import {
  isServiceFormDirty,
  selectNextVisibleServiceFormField,
  selectQuickViewSections,
  selectServiceFormProgress,
} from '../domain/selectors';
import type { ServiceFormFieldLayout } from '../domain/selectors';
import { hasAnySignature } from '../domain/signature';
import { buildUploadSignatureParams } from '../domain/signature-upload';
import { buildSignaturePostData, buildServicePostBody } from '../domain/submission';
import { validateVisibleServiceForm } from '../domain/validation';
import type { NormalizedServiceForm, ServiceFormField, ServiceFormSection } from '../domain/types';
import {
  useFetchRdwInfo,
  useServiceFormDrafts,
  useServiceFormLogger,
  useServiceFormService,
  useSignaturesApi,
} from '../hooks/service-form-context';
import { useServiceDefinition } from '../hooks/use-service-definition';
import { useServiceForm } from '../hooks/use-service-form';
import type { ServiceFormDraft } from '../service/draft-storage';
import { createServiceFormDraft, hasServiceFormDraftProgress } from '../service/draft-storage';
import {
  logServiceFormSubmitFailure,
  type ServiceFormSubmitStage,
} from '../service/service-form-service';
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
  const feedback = useFeedback();
  const router = useRouter();
  const definitionReloadInFlight = useRef(false);
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
  const { state, retry, reloadBundledDefinition } = useServiceDefinition(
    service?.dn_servicetypecode ?? undefined,
  );
  const reloadDefinitions = (): void => {
    if (definitionReloadInFlight.current) {
      return;
    }
    definitionReloadInFlight.current = true;
    void reloadBundledDefinition()
      .then((reloaded) => {
        feedback.show({
          tone: reloaded ? 'success' : 'error',
          message: t(
            reloaded
              ? 'serviceForm.dev.definitionsReloaded'
              : 'serviceForm.dev.definitionsReloadFailed',
          ),
        });
      })
      .finally(() => {
        definitionReloadInFlight.current = false;
      });
  };
  const pleaseSelectLabel = t('serviceForm.pleaseSelect');
  const languageCode = serviceFormLanguageCode(i18n.language);
  const definition = state.status === 'ready' ? state.definition : null;
  const phaseNumbers = phaseNumbersFromDefinition(definition?.definition);
  const phase = serviceFormPhaseForStatus(service?.statuscode, phaseNumbers);
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
        phaseNumbers={phaseNumbers}
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
        onReloadDefinitions={__DEV__ ? reloadDefinitions : undefined}
      />
    </ServiceFormStoreProvider>
  );
}

function ServiceFormBody({
  form,
  phaseNumbers,
  service,
  pleaseSelectLabel,
  preview,
  exitContext,
  onReloadDefinitions,
}: {
  form: NormalizedServiceForm;
  phaseNumbers: readonly number[];
  service: Service;
  pleaseSelectLabel: string;
  preview: boolean;
  exitContext: ExitContext;
  onReloadDefinitions?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const serviceFormService = useServiceFormService();
  const logger = useServiceFormLogger();
  const signaturesApi = useSignaturesApi();
  const drafts = useServiceFormDrafts();
  const photoService = usePhotoService();
  const storeApi = useServiceFormStoreApi();
  const { exit } = useProcessingExit();
  const statusOverlay = useStatusOverlay();
  const decline = useDeclineService({
    ...exitContext,
    serviceStatuscode: service.statuscode,
    serviceTypeCode: service.dn_servicetypecode ?? undefined,
  });
  const {
    answers,
    errors,
    fields,
    visibility,
    visibleSections,
    progress,
    requiredFieldOverrides,
    updateAnswer,
    updateAnswers,
    setFieldsRequired,
    blurField,
    validateForm,
  } = useServiceForm(form, pleaseSelectLabel);
  const fetchRdwInfo = useFetchRdwInfo();
  const initialAnswers = useServiceFormStore((state) => state.initialAnswers);
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
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [fieldLayouts, setFieldLayouts] = useState<Record<string, ServiceFormFieldLayout>>({});
  const [photoCoverage, setPhotoCoverage] = useState<{
    required: string[];
    present: string[];
    uploadsComplete: boolean;
  } | null>(null);
  const allowingLeave = useRef(false);
  const readOnly = preview || overviewActive;
  const photosComplete =
    photoCoverage !== null &&
    photoCoverage.uploadsComplete &&
    !needsPhotoConfirmation(photoCoverage.required, photoCoverage.present);
  const displayedSections = useMemo(
    () =>
      quickViewActive && !readOnly
        ? selectQuickViewSections(visibleSections, visibility.visibleFieldIds, answers, {
            requiredFieldOverrides,
            hideSignature,
            noEmailConfirmation,
            initialAnswers,
            focusedFieldId,
          })
        : visibleSections,
    [
      answers,
      focusedFieldId,
      hideSignature,
      initialAnswers,
      noEmailConfirmation,
      quickViewActive,
      readOnly,
      requiredFieldOverrides,
      visibility.visibleFieldIds,
      visibleSections,
    ],
  );

  const scrollRef = useRef<ScrollView>(null);
  const toolbarScroll = useServiceFormToolbarScroll();
  // React 19 refs are nullable; ScrollView's innerViewRef type still expects a View.
  const contentRef = useRef<View>(null);
  const sectionHeaderHeights = useRef(new Map<string, number>());
  const fieldRefs = useRef(new Map<string, View>());
  const inputRefs = useRef(new Map<string, TextInput>());
  const pendingJump = useRef<string | null>(null);

  const registerFieldRef = useCallback((fieldId: string, node: View | null): void => {
    if (node) {
      fieldRefs.current.set(fieldId, node);
      return;
    }

    fieldRefs.current.delete(fieldId);
    setFieldLayouts((current) => {
      if (current[fieldId] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }, []);

  const registerInputRef = useCallback((fieldId: string, node: TextInput | null): void => {
    if (node) {
      inputRefs.current.set(fieldId, node);
      return;
    }
    inputRefs.current.delete(fieldId);
  }, []);

  const loadPhotoCoverage = useCallback(async (): Promise<{
    required: string[];
    present: string[];
    uploadsComplete: boolean;
  }> => {
    const firstPhase = phaseNumbers[0];
    const phase: PhotoPhase =
      firstPhase !== undefined && form.phase !== firstPhase
        ? PHOTO_PHASE.delivery
        : PHOTO_PHASE.load;
    const photos = await photoService.listByService(exitContext.serviceId);
    const currentPhotos = photos.filter(
      (photo) => photo.phase === phase && photo.status === PHOTO_STATUS.sent,
    );
    let present = currentPhotos.map((photo) => photoRequirementName(photo.position));
    let required = [...form.photosMandatory];
    if (phase === PHOTO_PHASE.delivery) {
      const loadPhotos = photos.filter(
        (photo) => photo.phase === PHOTO_PHASE.load && photo.status !== PHOTO_STATUS.failed,
      );
      const serverLoadPhotos = await photoService.listServerPhotos({
        allocationId: exitContext.allocationId,
        incidentId: exitContext.incidentId,
        serviceId: exitContext.serviceId,
        phase: PHOTO_PHASE.load,
      });
      const loadPositions = reconcileHistoryPositions(
        loadPhotos,
        serverLoadPhotos
          .filter((photo) => photo.phase === PHOTO_PHASE.load)
          .map((photo) => photo.position),
        true,
      );
      const currentRequiredPositions = form.photosMandatory.map(photoPositionForRequirement);
      if (currentRequiredPositions.some((position) => position === null)) {
        throw new Error('Unknown required photo position');
      }
      required = deliveryPhotoRequirements(
        currentRequiredPositions.filter((position) => position !== null),
        loadPositions,
      ).map(photoRequirementName);
    }
    if (needsPhotoConfirmation(required, present)) {
      const serverPhotos = await photoService.listServerPhotos({
        allocationId: exitContext.allocationId,
        incidentId: exitContext.incidentId,
        serviceId: exitContext.serviceId,
        phase,
      });
      present = reconcileHistoryPositions(
        currentPhotos,
        serverPhotos.filter((photo) => photo.phase === phase).map((photo) => photo.position),
        true,
      ).map(photoRequirementName);
    }
    return { required, present, uploadsComplete: areServicePhotosUploaded(photos) };
  }, [
    exitContext.allocationId,
    exitContext.incidentId,
    exitContext.serviceId,
    form.phase,
    form.photosMandatory,
    phaseNumbers,
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
    const sectionId = visibleSections.find((candidate) =>
      candidate.fields.some((item) => item.id === fieldId),
    )?.id;
    const headerHeight =
      (sectionId !== undefined ? sectionHeaderHeights.current.get(sectionId) : undefined) ??
      serviceFormSectionHeaderFallbackHeight;
    node.measureLayout(content, (_x, y) => {
      scrollRef.current?.scrollTo({
        y: scrollOffsetBelowSectionHeader(y, headerHeight),
        animated: true,
      });
      inputRefs.current.get(fieldId)?.focus();
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
    const node = fieldRefs.current.get(fieldId);
    const content = contentRef.current;
    if (node && content) {
      node.measureLayout(content, (x, y) => {
        setFieldLayouts((current) => {
          const previous = current[fieldId];
          if (previous?.x === x && previous.y === y) {
            return current;
          }
          return { ...current, [fieldId]: { fieldId, x, y } };
        });
      });
    }

    if (pendingJump.current === fieldId) {
      pendingJump.current = null;
      scrollToField(fieldId);
    }
  };

  const nextVisibleField = useMemo(
    () => selectNextVisibleServiceFormField(fields, Object.values(fieldLayouts), activeFieldId),
    [activeFieldId, fieldLayouts, fields],
  );

  const activateField = (field: ServiceFormField): void => {
    setActiveFieldId(field.id);
    setFocusedFieldId(field.id);
  };

  const deactivateField = (field: ServiceFormField): void => {
    setActiveFieldId(field.id);
    setFocusedFieldId(null);
    blurField(field);
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
    logger.info('serviceForm', 'Service form submit requested');
    if (!validateForm()) {
      logger.warn('serviceForm', 'Service form submit stopped', { stage: 'field-validation' });
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

    let currentPhotoCoverage: { required: string[]; present: string[]; uploadsComplete: boolean };
    try {
      logger.info('serviceForm', 'Checking required photos before submit');
      currentPhotoCoverage = await loadPhotoCoverage();
    } catch (error) {
      logServiceFormSubmitFailure(logger, 'photo-check', error);
      Alert.alert(t('common.somethingWrong'));
      return;
    }
    if (!currentPhotoCoverage.uploadsComplete) {
      logger.warn('serviceForm', 'Service form submit stopped', { stage: 'photo-uploads' });
      Alert.alert(
        t('serviceForm.photos.uploadsPendingTitle'),
        t('serviceForm.photos.uploadsPendingMessage'),
      );
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]/photos',
        params: { id: exitContext.allocationId, serviceId: exitContext.serviceId },
      });
      return;
    }
    if (needsPhotoConfirmation(currentPhotoCoverage.required, currentPhotoCoverage.present)) {
      logger.warn('serviceForm', 'Service form submit stopped', { stage: 'missing-photos' });
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
      phaseNumbers,
    });
    if (termsAcceptanceRequired && !acceptedTermsAndConditions) {
      logger.warn('serviceForm', 'Service form submit stopped', { stage: 'terms-acceptance' });
      Alert.alert(t('serviceForm.signature.termsRequired'));
      return;
    }
    setSubmitting(true);
    let shouldExit = false;
    let wasBlocked = false;
    let submitStage: ServiceFormSubmitStage = 'signature-data';
    try {
      await statusOverlay.run(t('feedback.processing.submitService'), async () => {
        try {
          logger.info('serviceForm', 'Preparing signature for submit');
          const signatureData = buildSignaturePostData(
            fields,
            visibility.visibleFieldIds,
            answers,
            hideSignature,
            noEmailConfirmation,
            form.phase,
          );
          if (hasAnySignature(signatureData)) {
            submitStage = 'signature-validation';
            const upload = buildUploadSignatureParams({
              incidentId: exitContext.incidentId,
              serviceId: exitContext.serviceId,
              signatureData,
            });
            if (!isJpegBase64(upload.signatureData)) {
              throw new Error('Signature image must be JPEG');
            }
            submitStage = 'signature-upload';
            logger.info('serviceForm', 'Uploading signature before service update');
            await signaturesApi.upload({
              incidentId: upload.incidentId,
              serviceId: upload.serviceId,
              name: upload.name,
              email: upload.email,
              phase: upload.phase,
              signatureType: upload.signatureType,
              fileBytes: base64ToBytes(upload.signatureData),
            });
            logger.info('serviceForm', 'Signature uploaded');
          }
          submitStage = 'service-update';
          const result = await serviceFormService.submit({
            serviceId: exitContext.serviceId,
            statuscode: service.statuscode,
            body,
          });
          if (result.kind === 'blocked') {
            wasBlocked = true;
            shouldExit = true;
            submitStage = 'draft-clear';
            await clearDraftAndLeave();
            return { tone: 'none' as const };
          }
          submitStage = 'draft-clear';
          logger.info('serviceForm', 'Service update succeeded; clearing draft');
          await clearDraftAndLeave();
          shouldExit = true;
          logger.info('serviceForm', 'Service form submit flow completed');
          return {
            tone: 'success' as const,
            message: t(ACTION_FEEDBACK_MESSAGE.serviceSubmitted),
          };
        } catch (error) {
          logServiceFormSubmitFailure(logger, submitStage, error);
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

  const exportScenario = async (): Promise<void> => {
    const body = buildServicePostBody(fields, visibility.visibleFieldIds, answers, form.phase, {
      pleaseSelectLabel,
      hideSignature,
      noEmailConfirmation,
      phaseNumbers,
    });
    const scenario = createServiceFormScenario(form, answers, body);
    await Share.share({ message: JSON.stringify(scenario, null, 2) });
  };

  const confirmDecline = async (): Promise<void> => {
    await clearDraftAndLeave();
    await decline.confirm();
  };

  const ready = progress.remaining === 0;
  const details = [service.dn_servicenumber, service.dn_concatlicenseplate].filter(
    (value): value is string => typeof value === 'string' && value !== '',
  );
  const showQuickComplete = quickViewActive && displayedSections.length === 0;
  const expandedFlags = displayedSections.map((section) => Boolean(expandedSections[section.id]));
  const stickyHeaderIndices = serviceFormStickyHeaderIndices(
    expandedFlags,
    showQuickComplete ? 2 : 1,
  );
  const renderSectionFields = (section: ServiceFormSection): ReactElement => {
    const licensePlateGroup = findLicensePlateGroupInFields(section.fields);
    const licensePlateFieldKeys = licensePlateGroup
      ? new Set(licensePlateGroup.orderedFields.map((field) => field.key))
      : null;
    const fieldsWithoutLicensePlate = licensePlateFieldKeys
      ? section.fields.filter((field) => !licensePlateFieldKeys.has(field.key))
      : section.fields;
    const { vehicleFields, otherFields } = licensePlateGroup
      ? { vehicleFields: [] as typeof section.fields, otherFields: fieldsWithoutLicensePlate }
      : partitionVehicleRegistrationFields(fieldsWithoutLicensePlate);
    const fieldGroups = readOnly
      ? groupSectionFields(otherFields, { readonly: true })
      : buildAddressEntrySectionRenderItems(otherFields);
    return (
      <>
        {licensePlateGroup ? (
          <ServiceFormLicensePlateGroup
            group={licensePlateGroup}
            answers={answers}
            errors={errors}
            pleaseSelectLabel={pleaseSelectLabel}
            readOnly={readOnly}
            fetchRdwInfo={fetchRdwInfo}
            updateAnswer={updateAnswer}
            updateAnswers={updateAnswers}
            setFieldsRequired={setFieldsRequired}
            onFocus={activateField}
            onBlur={deactivateField}
            registerFieldRef={registerFieldRef}
            registerInputRef={registerInputRef}
            onFieldLayout={handleFieldLayout}
          />
        ) : null}
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
            onFocus={activateField}
            onBlur={deactivateField}
            registerFieldRef={registerFieldRef}
            registerInputRef={registerInputRef}
            onFieldLayout={handleFieldLayout}
          />
        ) : null}
        {fieldGroups.map((group) =>
          group.kind === 'readonly' ? (
            <ReadonlyFieldSummary
              key={group.fields.map((field) => field.id).join(':')}
              fields={group.fields}
              answers={answers}
            />
          ) : group.kind === 'address-entry' ? (
            <ServiceFormAddressGroup
              key={group.group.anchor.id}
              group={group.group}
              answers={answers}
              errors={errors}
              pleaseSelectLabel={pleaseSelectLabel}
              readOnly={readOnly}
              updateAnswer={updateAnswer}
              updateAnswers={updateAnswers}
              onFocus={activateField}
              onBlur={deactivateField}
              registerFieldRef={registerFieldRef}
              registerInputRef={registerInputRef}
              onFieldLayout={handleFieldLayout}
            />
          ) : (
            <View
              key={group.field.id}
              collapsable={false}
              ref={(node) => registerFieldRef(group.field.id, node)}
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
                registerInputRef={registerInputRef}
                onFocus={activateField}
                onBlur={deactivateField}
              />
            </View>
          ),
        )}
      </>
    );
  };
  const scrollChildren: ReactElement[] = [
    <View key="section-scroll-inset" style={styles.scrollTopInset} />,
  ];
  if (showQuickComplete) {
    scrollChildren.push(
      <Text key="quick-complete" style={styles.quickComplete}>
        {t('serviceForm.actions.quickViewComplete')}
      </Text>,
    );
  }
  for (const [index, section] of displayedSections.entries()) {
    const expanded = expandedFlags[index] === true;
    const sectionProgress = selectServiceFormProgress(
      section.fields,
      visibility.visibleFieldIds,
      answers,
      { requiredFieldOverrides, hideSignature, noEmailConfirmation },
    );
    scrollChildren.push(
      <ServiceFormSectionHeader
        key={`${section.id}:header`}
        title={section.title}
        expanded={expanded}
        completed={sectionProgress.completed}
        total={sectionProgress.total}
        errorCount={readOnly ? 0 : section.fields.filter((field) => errors[field.key]).length}
        onToggle={() => toggleSection(section.id)}
        onLayout={(event) => {
          sectionHeaderHeights.current.set(section.id, event.nativeEvent.layout.height);
        }}
      />,
    );
    if (expanded) {
      scrollChildren.push(
        <ServiceFormSectionBody key={`${section.id}:body`}>
          {renderSectionFields(section)}
        </ServiceFormSectionBody>,
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={readOnly ? ['bottom'] : []}>
      <ServiceFormHeader
        serviceName={form.serviceName}
        phaseName={form.phaseName}
        progress={progress}
        details={details}
        onReloadDefinitions={onReloadDefinitions}
      />
      <ServiceFormToolbar
        visible={toolbarScroll.visible}
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
      <ScrollView
        ref={scrollRef}
        innerViewRef={contentRef as RefObject<View>}
        stickyHeaderIndices={stickyHeaderIndices}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        scrollEventThrottle={16}
        onScroll={toolbarScroll.onScroll}
        contentContainerStyle={styles.sections}
      >
        {scrollChildren}
      </ScrollView>
      {!readOnly ? (
        <ScreenFooter>
          {__DEV__ ? (
            <Button
              label={t('serviceForm.actions.exportScenario')}
              variant="secondary"
              onPress={() => void exportScenario()}
            />
          ) : null}
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
              disabled={!nextVisibleField}
              onPress={() => {
                if (nextVisibleField) {
                  setActiveFieldId(nextVisibleField.id);
                  jumpToField(nextVisibleField);
                }
              }}
            />
          )}
        </ScreenFooter>
      ) : null}
      {!preview ? (
        <ServiceDeclineSheet
          state={decline.state}
          canReturnToDispatch={canReturnToDispatch(service.statuscode)}
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
  sections: { marginTop: spacing.md, paddingHorizontal: spacing.md },
  scrollTopInset: { height: spacing.md },
  ready: { color: colors.success, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  quickComplete: {
    color: colors.success,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.md,
  },
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
