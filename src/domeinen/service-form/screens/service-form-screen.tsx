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
  useDeclineService,
  useProcessingExit,
  useProcessingService,
} from '@/domeinen/allocations/ui';
import { useDevUiToolsEnabled } from '@/domeinen/settings/ui';
import { PreviewModePill, WorkerStatusPill } from '@/domeinen/worker/ui';
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
import { ServiceFormHeader } from '../components/service-form-header';
import { ServiceFormToolbar } from '../components/service-form-toolbar';
import { useServiceFormToolbarScroll } from '../components/use-service-form-toolbar-scroll';
import {
  ServiceFormSectionBody,
  ServiceFormSectionHeader,
  serviceFormSectionHeaderFallbackHeight,
} from '../components/service-form-section';
import { ServiceFormSectionFields } from '../components/service-form-section-fields';
import { ServiceFormResetSheet } from '../components/service-form-reset-sheet';
import {
  SERVICE_FORM_PHASE,
  phaseNumbersFromDefinition,
  serviceFormLanguageCode,
  serviceFormPhaseForStatus,
} from '../domain/form-context';
import { resolveServiceFormLoadState } from '../domain/load-state';
import { areServicePhotosUploaded, needsPhotoConfirmation } from '../domain/photos-confirm';
import { normalizeServiceFormDefinition } from '../domain/schema';
import {
  scrollOffsetBelowSectionHeader,
  serviceFormStickyHeaderIndices,
  serviceFormStickySectionId,
} from '../domain/section-scroll';
import { buildSectionReset, selectDirtyResetSections } from '../domain/section-reset';
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
import {
  applyReleaseSubmitFields,
  buildSignaturePostData,
  buildServicePostBody,
} from '../domain/submission';
import { validateVisibleServiceForm } from '../domain/validation';
import type { NormalizedServiceForm, ServiceFormField, ServiceFormSection } from '../domain/types';
import {
  useFetchRdwInfo,
  useServiceFormClock,
  useServiceFormDrafts,
  useServiceFormLogger,
  useServiceFormService,
  useSignaturesApi,
} from '../hooks/service-form-context';
import { usePrefetchServiceFormSelectOptions } from '../hooks/use-prefetch-service-form-select-options';
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
  isReleaseItem?: boolean;
  locationId?: string;
};

type DraftGate = { status: 'loading' } | { status: 'ready'; draft: ServiceFormDraft | null };

const TERMS_URL = 'https://berging-mobiliteit.nl/';

/**
 * The processing form of one service: the schema from the synced reference data, filled in with
 * the service's current CRM values, for the phase its status is in. Sending it hands over to the
 * same exit flow as every other way out of processing (`useProcessingExit`).
 * `preview` shows the form read-only (old `previewMode` / `CheckStatus === 1`): no submit, no edits.
 * Closing an already-finished service uses `ServiceFinishScreen`, not this screen.
 */
export function ServiceFormScreen({
  allocationId,
  serviceId,
  preview = false,
  isReleaseItem = false,
  locationId,
}: {
  allocationId: string;
  serviceId: string;
  preview?: boolean;
  isReleaseItem?: boolean;
  locationId?: string;
}) {
  const { t, i18n } = useTranslation();
  const feedback = useFeedback();
  const router = useRouter();
  const uiToolsEnabled = useDevUiToolsEnabled();
  const definitionReloadInFlight = useRef(false);
  const drafts = useServiceFormDrafts();
  const processing = useProcessingService({
    allocationId,
    serviceId,
    locationId: isReleaseItem ? locationId : undefined,
  });
  const draftAllocationId = processing.scopeId;
  const allocation = processing.allocation;
  const services = processing.services;
  const service = processing.service;
  const incidentId = processing.incidentId;
  const allocationsPending = processing.allocationsPending;
  const servicesPending = processing.servicesPending;
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
    servicesPending,
    serviceFound: service !== undefined,
    definitionStatus: state.status,
    draftPending: draftGate.status === 'loading',
    isReleaseItem,
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
      const loaded = await drafts.load(draftAllocationId, serviceId);
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
  }, [draftAllocationId, drafts, preview, serviceId]);

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

  const readyForForm =
    loadState === 'ready' &&
    model !== null &&
    service !== undefined &&
    (isReleaseItem || allocation !== undefined);

  if (!readyForForm || !model || !service) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          {loadState === 'failed' ? t('common.somethingWrong') : t('serviceForm.noDefinition')}
        </Text>
        <Button label={t('common.retry')} variant="secondary" onPress={retry} />
      </View>
    );
  }

  const populatedSectionIds = model.form.sections
    .filter((section) => section.fields.length > 0)
    .map((section) => section.id);
  const initialExpandedSectionIds = populatedSectionIds.slice(0, 1);
  const draft = draftGate.status === 'ready' ? draftGate.draft : null;

  return (
    <ServiceFormStoreProvider
      key={`${model.form.serviceCode}:${model.form.phase}:${languageCode}:${draft?.timestamp ?? 0}`}
      initialAnswers={model.initialAnswers}
      initialExpandedSectionIds={initialExpandedSectionIds}
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
          allocationId: draftAllocationId,
          serviceId,
          incidentId,
          allocationTypeCode: allocation?.type,
          services,
          isReleaseItem,
          locationId,
        }}
        onReloadDefinitions={uiToolsEnabled ? reloadDefinitions : undefined}
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
  const uiToolsEnabled = useDevUiToolsEnabled();
  const serviceFormService = useServiceFormService();
  const logger = useServiceFormLogger();
  const clock = useServiceFormClock();
  const signaturesApi = useSignaturesApi();
  const drafts = useServiceFormDrafts();
  const photoService = usePhotoService();
  const storeApi = useServiceFormStoreApi();
  const { exit } = useProcessingExit();
  const statusOverlay = useStatusOverlay();
  const photosParams = {
    id: exitContext.allocationId,
    serviceId: exitContext.serviceId,
    incidentId: exitContext.incidentId,
    statuscode: String(service.statuscode),
    ...(exitContext.locationId !== undefined && exitContext.locationId !== ''
      ? { locationId: exitContext.locationId }
      : {}),
  };
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
  usePrefetchServiceFormSelectOptions(form);
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
  const uiResetEpoch = useServiceFormStore((state) => state.uiResetEpoch);
  const [submitting, setSubmitting] = useState(false);
  const [resetSheetVisible, setResetSheetVisible] = useState(false);
  const [quickViewActive, setQuickViewActive] = useState(false);
  const [overviewActive, setOverviewActive] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
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
  const sectionHeaderOffsets = useRef(new Map<string, number>());
  const scrollOffsetY = useRef(0);
  const fieldRefs = useRef(new Map<string, View>());
  const inputRefs = useRef(new Map<string, TextInput>());
  const pendingJump = useRef<string | null>(null);
  const [stickySectionId, setStickySectionId] = useState<string | null>(null);

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

  const dirtyResetSections = useMemo(
    () => selectDirtyResetSections(visibleSections, initialAnswers, answers),
    [answers, initialAnswers, visibleSections],
  );

  const persistDraftAfterSectionReset = useCallback(async (): Promise<void> => {
    const state = storeApi.getState();
    if (!isServiceFormDirty(state.initialAnswers, state.answers)) {
      await drafts.clear(exitContext.allocationId, exitContext.serviceId);
      return;
    }
    await drafts.save(
      exitContext.allocationId,
      exitContext.serviceId,
      createServiceFormDraft(state),
    );
  }, [drafts, exitContext.allocationId, exitContext.serviceId, storeApi]);

  const resetFullForm = useCallback(async (): Promise<void> => {
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
  }, [drafts, exitContext.allocationId, exitContext.serviceId, storeApi, t]);

  const resetFormSection = useCallback(
    async (section: ServiceFormSection): Promise<void> => {
      const accepted = await confirm({
        title: t('serviceForm.reset.sectionTitle', { title: section.title }),
        message: t('serviceForm.reset.sectionMessage'),
        confirmLabel: t('serviceForm.reset.sectionAction'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!accepted) {
        return;
      }
      try {
        const state = storeApi.getState();
        const result = buildSectionReset(
          section,
          fields,
          state.initialAnswers,
          state.answers,
          pleaseSelectLabel,
        );
        state.resetSection(result.answers, result.fieldKeys);
        await persistDraftAfterSectionReset();
      } catch {
        Alert.alert(t('common.somethingWrong'));
      }
    },
    [fields, persistDraftAfterSectionReset, pleaseSelectLabel, storeApi, t],
  );

  useEffect(() => {
    const showPreviewHeader = preview || overviewActive;
    navigation.setOptions({
      headerTitle: () => (showPreviewHeader ? <PreviewModePill /> : <WorkerStatusPill />),
      headerRight: preview
        ? () => null
        : () => <ResetFormHeaderButton onPress={() => setResetSheetVisible(true)} />,
    });
  }, [navigation, overviewActive, preview]);

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
        params: photosParams,
      });
      return;
    }
    if (needsPhotoConfirmation(currentPhotoCoverage.required, currentPhotoCoverage.present)) {
      logger.warn('serviceForm', 'Service form submit stopped', { stage: 'missing-photos' });
      Alert.alert(t('serviceForm.photos.missingTitle'), t('serviceForm.photos.missingMessage'));
      router.push({
        pathname: '/allocations/[id]/services/[serviceId]/photos',
        params: photosParams,
      });
      return;
    }

    let body = buildServicePostBody(fields, visibility.visibleFieldIds, answers, form.phase, {
      pleaseSelectLabel,
      hideSignature,
      noEmailConfirmation,
      phaseNumbers,
    });
    if (exitContext.isReleaseItem === true) {
      body = applyReleaseSubmitFields(body, {
        pickedUpAtIso: new Date(clock.now()).toISOString(),
      });
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
            isReleaseItem: exitContext.isReleaseItem,
            serviceTypeCode: service.dn_servicetypecode ?? undefined,
          });
          if (result.kind === 'blocked') {
            wasBlocked = true;
            shouldExit = true;
            submitStage = 'draft-clear';
            await clearDraftAndLeave();
            return { tone: 'none' as const };
          }
          if (
            form.phase === SERVICE_FORM_PHASE.load &&
            phaseNumbers.includes(SERVICE_FORM_PHASE.delivery)
          ) {
            try {
              await drafts.savePhaseOneSnapshot(
                exitContext.allocationId,
                exitContext.serviceId,
                answers,
              );
            } catch (error) {
              logger.warn('serviceForm', 'Phase-one snapshot save failed', { error });
            }
          }
          submitStage = 'draft-clear';
          logger.info('serviceForm', 'Service update succeeded; clearing draft');
          await clearDraftAndLeave();
          if (exitContext.isReleaseItem === true) {
            try {
              await photoService.clearForAllocation(exitContext.allocationId);
            } catch (error) {
              logger.warn('serviceForm', 'Release photo cleanup failed', { error });
            }
          }
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
          isReleaseItem: exitContext.isReleaseItem,
          locationId: exitContext.locationId,
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

  const showFooter = !readOnly;
  const showQuickComplete = quickViewActive && displayedSections.length === 0;
  const expandedFlags = displayedSections.map((section) => Boolean(expandedSections[section.id]));
  const stickyHeaderIndices = serviceFormStickyHeaderIndices(
    expandedFlags,
    showQuickComplete ? 2 : 1,
  );
  const updateStickySection = useCallback(
    (offsetY: number): void => {
      scrollOffsetY.current = offsetY;
      setStickySectionId(
        serviceFormStickySectionId(
          displayedSections.map((section) => section.id),
          sectionHeaderOffsets.current,
          offsetY,
        ),
      );
    },
    [displayedSections],
  );
  useEffect(() => {
    updateStickySection(scrollOffsetY.current);
  }, [updateStickySection]);

  const renderSectionFields = (section: ServiceFormSection): ReactElement => (
    <ServiceFormSectionFields
      section={section}
      answers={answers}
      errors={errors}
      readOnly={readOnly}
      pleaseSelectLabel={pleaseSelectLabel}
      uiResetEpoch={uiResetEpoch}
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
  );

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
      {
        requiredFieldOverrides,
        hideSignature,
        noEmailConfirmation,
      },
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
          const { height, y } = event.nativeEvent.layout;
          sectionHeaderHeights.current.set(section.id, height);
          sectionHeaderOffsets.current.set(section.id, y);
          updateStickySection(scrollOffsetY.current);
        }}
        isSticky={stickySectionId === section.id}
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
        actions={{
          onToggleQuickView: () => {
            setOverviewActive(false);
            setQuickViewActive((active) => !active);
          },
          onOpenPhotos: () =>
            router.push({
              pathname: '/allocations/[id]/services/[serviceId]/photos',
              params: photosParams,
            }),
          onToggleOverview: () => {
            setQuickViewActive(false);
            setOverviewActive((active) => !active);
          },
          onOpenTerms: () =>
            void Linking.openURL(TERMS_URL).catch(() => Alert.alert(t('common.somethingWrong'))),
          onOpenDecline: decline.open,
          quickViewActive,
          photosComplete,
          overviewActive,
        }}
      />
      <ScrollView
        ref={scrollRef}
        innerViewRef={contentRef as RefObject<View>}
        stickyHeaderIndices={stickyHeaderIndices}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          toolbarScroll.onScroll(event);
          updateStickySection(event.nativeEvent.contentOffset.y);
        }}
        scrollIndicatorInsets={{ bottom: showFooter ? footerHeight : 0 }}
        contentContainerStyle={[
          styles.sections,
          showFooter && footerHeight > 0 ? { paddingBottom: footerHeight + spacing.md } : null,
        ]}
      >
        {scrollChildren}
      </ScrollView>
      {showFooter ? (
        <View
          style={styles.footerOverlay}
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        >
          <ScreenFooter backgroundColor="rgba(255, 255, 255, 0.15)">
            {uiToolsEnabled ? (
              <Button
                label={t('serviceForm.actions.exportScenario')}
                variant="secondary"
                onPress={() => void exportScenario()}
              />
            ) : null}
            {ready ? (
              <Button
                label={t('serviceForm.submit')}
                onPress={() => void submit()}
                disabled={termsAcceptanceRequired && !acceptedTermsAndConditions}
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
        </View>
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
      {!preview ? (
        <ServiceFormResetSheet
          visible={resetSheetVisible}
          dirtySections={dirtyResetSections}
          onClose={() => setResetSheetVisible(false)}
          onSelectSection={(section) => {
            setResetSheetVisible(false);
            void resetFormSection(section);
          }}
          onSelectFullForm={() => {
            setResetSheetVisible(false);
            void resetFullForm();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  footerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sections: {},
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
