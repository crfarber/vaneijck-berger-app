import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Service } from '@/domeinen/allocations';
import { useAllocations, useProcessingExit, useServices } from '@/domeinen/allocations/ui';
import { Button } from '@/shared/ui/button';
import { ScreenFooter } from '@/shared/ui/screen-footer';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { ServiceFormHeader } from '../components/service-form-header';
import { ServiceFormSectionFields } from '../components/service-form-section-fields';
import {
  ServiceFormSectionBody,
  ServiceFormSectionHeader,
} from '../components/service-form-section';
import { evaluateServiceFormVisibility } from '../domain/conditions';
import {
  SERVICE_FORM_FINISH_PHASES,
  SERVICE_FORM_PHASE,
  serviceFormLanguageCode,
} from '../domain/form-context';
import { resolveServiceFormLoadState } from '../domain/load-state';
import { normalizeServiceFormDefinition } from '../domain/schema';
import { selectServiceFormProgress, selectVisibleServiceFormSections } from '../domain/selectors';
import type {
  NormalizedServiceForm,
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormField,
  ServiceFormSection,
} from '../domain/types';
import { resolvePhaseOneServiceFormAnswers } from '../domain/values';
import { useServiceFormDrafts, useServiceFormLogger } from '../hooks/service-form-context';
import { useServiceDefinition } from '../hooks/use-service-definition';
import {
  ServiceFormStoreProvider,
  useServiceFormStore,
} from '../store/service-form-store-provider';

type PhaseOneSnapshotGate =
  { status: 'loading' } | { status: 'ready'; answers: ServiceFormAnswers | null };

/**
 * Closing screen after phase 2: Start and Delivery read-only, one Finish button.
 * No back button, swipe-back, or Android hardware back — the only exit is finish.
 */
export function ServiceFinishScreen({
  allocationId,
  serviceId,
}: {
  allocationId: string;
  serviceId: string;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const drafts = useServiceFormDrafts();
  const logger = useServiceFormLogger();
  const { sections, isPending: allocationsPending } = useAllocations();
  const [active, pending] = sections;
  const allocation = [...active.data, ...pending.data].find(
    (item) => item.dn_allocationid === allocationId,
  );
  const incidentId = allocation?.incident.dn_incidentid ?? '';
  const servicesQuery = useServices(incidentId, allocation?.services ?? null);
  const services = servicesQuery.data ?? allocation?.services ?? [];
  const service = services.find((item) => item.dn_serviceid === serviceId);
  const [finishPhase, setFinishPhase] = useState<number>(SERVICE_FORM_FINISH_PHASES[0]);
  const { state, retry } = useServiceDefinition(service?.dn_servicetypecode ?? undefined);
  const pleaseSelectLabel = t('serviceForm.pleaseSelect');
  const languageCode = serviceFormLanguageCode(i18n.language);
  const definition = state.status === 'ready' ? state.definition : null;
  const [phaseOneSnapshotGate, setPhaseOneSnapshotGate] = useState<PhaseOneSnapshotGate>({
    status: 'loading',
  });
  const loadState = resolveServiceFormLoadState({
    allocationsPending,
    allocationFound: allocation !== undefined,
    servicesPending: servicesQuery.isPending,
    serviceFound: service !== undefined,
    definitionStatus: state.status,
    draftPending: phaseOneSnapshotGate.status === 'loading',
  });

  const model = useMemo(
    () =>
      definition
        ? normalizeServiceFormDefinition(definition, {
            phase: finishPhase,
            languageCode,
            values: service ?? {},
            pleaseSelectLabel,
          })
        : null,
    [definition, finishPhase, languageCode, pleaseSelectLabel, service],
  );

  useEffect(() => {
    let cancelled = false;
    void drafts
      .loadPhaseOneSnapshot(allocationId, serviceId)
      .then((answers) => {
        if (!cancelled) {
          setPhaseOneSnapshotGate({ status: 'ready', answers });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          logger.warn('serviceForm', 'Phase-one snapshot read failed', { error });
          setPhaseOneSnapshotGate({ status: 'ready', answers: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [allocationId, drafts, logger, serviceId]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const initialAnswers = useMemo<ServiceFormAnswers>(() => {
    const snapshot = phaseOneSnapshotGate.status === 'ready' ? phaseOneSnapshotGate.answers : null;
    const currentAnswers = model?.initialAnswers ?? {};
    return resolvePhaseOneServiceFormAnswers(
      currentAnswers,
      finishPhase === SERVICE_FORM_PHASE.load ? snapshot : null,
    );
  }, [finishPhase, model?.initialAnswers, phaseOneSnapshotGate]);

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

  const populatedSectionIds = model.form.sections
    .filter((section) => section.fields.length > 0)
    .map((section) => section.id);

  return (
    <ServiceFormStoreProvider
      key={`${model.form.serviceCode}:${model.form.phase}:${languageCode}`}
      initialAnswers={initialAnswers}
      initialExpandedSectionIds={populatedSectionIds}
      requiresTermsAcceptance={false}
      persistedDraft={null}
    >
      <ServiceFinishBody
        form={model.form}
        service={service}
        pleaseSelectLabel={pleaseSelectLabel}
        finishPhase={finishPhase}
        onFinishPhaseChange={setFinishPhase}
        exitContext={{
          allocationId,
          serviceId,
          incidentId,
          allocationTypeCode: allocation.type,
          services,
          serviceTypeCode: service.dn_servicetypecode ?? undefined,
        }}
      />
    </ServiceFormStoreProvider>
  );
}

function ServiceFinishBody({
  form,
  service,
  pleaseSelectLabel,
  finishPhase,
  onFinishPhaseChange,
  exitContext,
}: {
  form: NormalizedServiceForm;
  service: Service;
  pleaseSelectLabel: string;
  finishPhase: number;
  onFinishPhaseChange: (phase: number) => void;
  exitContext: {
    allocationId: string;
    serviceId: string;
    incidentId: string;
    allocationTypeCode?: number;
    services: readonly Service[];
    serviceTypeCode?: number;
  };
}) {
  const { t } = useTranslation();
  const drafts = useServiceFormDrafts();
  const logger = useServiceFormLogger();
  const { exit } = useProcessingExit();
  const [submitting, setSubmitting] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const answers = useServiceFormStore((state) => state.answers);
  const expandedSections = useServiceFormStore((state) => state.expandedSections);
  const toggleSection = useServiceFormStore((state) => state.toggleSection);
  const uiResetEpoch = useServiceFormStore((state) => state.uiResetEpoch);

  const fields = useMemo(() => form.sections.flatMap((section) => section.fields), [form.sections]);
  const visibility = useMemo(() => evaluateServiceFormVisibility(form, answers), [answers, form]);
  const visibleSections = useMemo(
    () => selectVisibleServiceFormSections(form, visibility),
    [form, visibility],
  );
  const progress = useMemo(
    () => selectServiceFormProgress(fields, visibility.visibleFieldIds, answers),
    [answers, fields, visibility.visibleFieldIds],
  );

  const details = [service.dn_servicenumber, service.dn_concatlicenseplate].filter(
    (value): value is string => typeof value === 'string' && value !== '',
  );

  const finish = async (): Promise<void> => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await drafts.clearPhaseOneSnapshot(exitContext.allocationId, exitContext.serviceId);
      exit({
        trigger: 'finish',
        fromProcessingFinish: true,
        allocationId: exitContext.allocationId,
        serviceId: exitContext.serviceId,
        incidentId: exitContext.incidentId,
        allocationTypeCode: exitContext.allocationTypeCode,
        services: exitContext.services,
        serviceTypeCode: exitContext.serviceTypeCode,
      });
    } catch (error) {
      logger.warn('serviceForm', 'Phase-one snapshot cleanup failed', { error });
      setSubmitting(false);
      Alert.alert(t('common.somethingWrong'));
    }
  };

  const noopField = (_field: ServiceFormField): void => undefined;
  const noopAnswer = (_fieldKey: string, _answer: ServiceFormAnswer): void => undefined;
  const noopAnswers = (_updates: ServiceFormAnswers): void => undefined;
  const noopRequired = (_keys: string[], _required: boolean): void => undefined;
  const noopFieldRef = (_id: string, _node: View | null): void => undefined;
  const noopInputRef = (_id: string, _node: TextInput | null): void => undefined;
  const noopLayout = (_id: string): void => undefined;

  const scrollChildren: ReactElement[] = [
    <View key="section-scroll-inset" style={styles.scrollTopInset} />,
  ];
  for (const section of visibleSections) {
    const expanded = Boolean(expandedSections[section.id]);
    const sectionProgress = selectServiceFormProgress(
      section.fields,
      visibility.visibleFieldIds,
      answers,
    );
    scrollChildren.push(
      <ServiceFormSectionHeader
        key={`${section.id}:header`}
        title={section.title}
        expanded={expanded}
        completed={sectionProgress.completed}
        total={sectionProgress.total}
        errorCount={0}
        onToggle={() => toggleSection(section.id)}
      />,
    );
    if (expanded) {
      scrollChildren.push(
        <ServiceFormSectionBody key={`${section.id}:body`}>
          {renderFinishSection(section)}
        </ServiceFormSectionBody>,
      );
    }
  }

  function renderFinishSection(section: ServiceFormSection): ReactElement {
    return (
      <ServiceFormSectionFields
        section={section}
        answers={answers}
        errors={{}}
        readOnly
        pleaseSelectLabel={pleaseSelectLabel}
        uiResetEpoch={uiResetEpoch}
        fetchRdwInfo={undefined}
        updateAnswer={noopAnswer}
        updateAnswers={noopAnswers}
        setFieldsRequired={noopRequired}
        onFocus={noopField}
        onBlur={noopField}
        registerFieldRef={noopFieldRef}
        registerInputRef={noopInputRef}
        onFieldLayout={noopLayout}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ServiceFormHeader
        serviceName={form.serviceName}
        phaseName={form.phaseName}
        progress={progress}
        details={details}
      />
      <View style={styles.finishHeader}>
        <View style={styles.finishPhaseSwitch}>
          {SERVICE_FORM_FINISH_PHASES.map((phase) => {
            const selected = finishPhase === phase;
            const label =
              phase === SERVICE_FORM_PHASE.load
                ? t('serviceForm.finish.start')
                : t('serviceForm.finish.delivery');
            return (
              <Pressable
                key={phase}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => onFinishPhaseChange(phase)}
                style={[styles.finishPhaseOption, selected && styles.finishPhaseOptionActive]}
              >
                <Text style={[styles.finishPhaseLabel, selected && styles.finishPhaseLabelActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        bounces={false}
        scrollIndicatorInsets={{ bottom: footerHeight }}
        contentContainerStyle={[
          styles.sections,
          footerHeight > 0 ? { paddingBottom: footerHeight + spacing.md } : null,
        ]}
      >
        {scrollChildren}
      </ScrollView>
      <View
        style={styles.footerOverlay}
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
      >
        <ScreenFooter backgroundColor="rgba(255, 255, 255, 0.15)">
          <Button
            label={t('services.finish.submit')}
            onPress={() => void finish()}
            loading={submitting}
          />
        </ScreenFooter>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  footerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sections: {},
  finishHeader: { padding: spacing.md, gap: spacing.md },
  finishPhaseSwitch: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.md,
  },
  finishPhaseOption: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  finishPhaseOptionActive: { backgroundColor: colors.brand },
  finishPhaseLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  finishPhaseLabelActive: { color: colors.brandText },
  scrollTopInset: { height: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  message: { color: colors.text, fontSize: 15, textAlign: 'center' },
});
