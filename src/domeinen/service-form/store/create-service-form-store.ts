import { createStore } from 'zustand/vanilla';
import { cloneServiceFormAnswers } from '../domain/values';
import type {
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormErrors,
  ServiceFormRequiredOverrides,
} from '../domain/types';
import type { ServiceFormDraft } from '../service/draft-storage';

/**
 * One session's worth of in-progress answers, touched/error state and UI state (expanded
 * sections, the recommended next field). Ported from `store/createServicesFormStore.ts` — a fresh
 * vanilla store per mounted form, never a shared/global one (two forms open at once, or the same
 * form reopened, must never see each other's edits).
 */
export type ServiceFormState = {
  answers: ServiceFormAnswers;
  initialAnswers: ServiceFormAnswers;
  touched: Record<string, true>;
  errors: ServiceFormErrors;
  requiredFieldOverrides: ServiceFormRequiredOverrides;
  expandedSections: Record<string, true>;
  recommendedFieldId: string | null;
  /** Field keys of signature fields marked "not available" by the user. */
  hideSignature: Record<string, true>;
  /** Field keys of signature fields where the email confirmation was skipped. */
  noEmailConfirmation: Record<string, true>;
  /** Whether the (global) transport conditions have been accepted. */
  acceptedTermsAndConditions: boolean;
  /** Fixed form-shape fact: does this form contain a transport-conditions field? Not reset. */
  termsAcceptanceRequired: boolean;
  /**
   * Bumped on every section or full reset so compact groups (address / license plate) remount
   * and drop local UI state that is not derived from answers alone.
   */
  uiResetEpoch: number;
  initialize: (
    answers: ServiceFormAnswers,
    initialExpandedSectionIds?: string | readonly string[],
    requiresTermsAcceptance?: boolean,
    draft?: ServiceFormDraft | null,
  ) => void;
  setAnswer: (fieldKey: string, answer: ServiceFormAnswer) => void;
  setAnswers: (answers: ServiceFormAnswers) => void;
  setFieldsRequired: (fieldKeys: string[], required: boolean) => void;
  touchField: (fieldKey: string) => void;
  setFieldError: (fieldKey: string, error: ServiceFormErrors[string] | null) => void;
  setErrors: (errors: ServiceFormErrors) => void;
  toggleSection: (sectionId: string) => void;
  expandSection: (sectionId: string) => void;
  setRecommendedFieldId: (fieldId: string | null) => void;
  toggleHideSignature: (fieldKey: string) => void;
  toggleNoEmailConfirmation: (fieldKey: string) => void;
  setAcceptedTermsAndConditions: (accepted: boolean) => void;
  reset: () => void;
  /**
   * Restores a subset of fields (typically one section plus cleared dependents) and bumps
   * `uiResetEpoch`. `answers` is the full next answer map from `buildSectionReset`.
   */
  resetSection: (answers: ServiceFormAnswers, fieldKeys: readonly string[]) => void;
  /** Rebuilds answers from a fresh backend baseline without applying a draft. */
  reinitializeToBackend: (
    answers: ServiceFormAnswers,
    initialExpandedSectionId?: string,
    requiresTermsAcceptance?: boolean,
  ) => void;
};

const initialState = {
  answers: {},
  initialAnswers: {},
  touched: {},
  errors: {},
  requiredFieldOverrides: {},
  expandedSections: {},
  recommendedFieldId: null,
  hideSignature: {},
  noEmailConfirmation: {},
  acceptedTermsAndConditions: true,
  termsAcceptanceRequired: false,
  uiResetEpoch: 0,
} satisfies Pick<
  ServiceFormState,
  | 'answers'
  | 'initialAnswers'
  | 'touched'
  | 'errors'
  | 'requiredFieldOverrides'
  | 'expandedSections'
  | 'recommendedFieldId'
  | 'hideSignature'
  | 'noEmailConfirmation'
  | 'acceptedTermsAndConditions'
  | 'termsAcceptanceRequired'
  | 'uiResetEpoch'
>;

export const createServiceFormStore = () =>
  createStore<ServiceFormState>()((set) => ({
    ...initialState,
    initialize: (
      answers,
      initialExpandedSectionIds,
      requiresTermsAcceptance = false,
      draft = null,
    ) => {
      const baseline = cloneServiceFormAnswers(answers);
      const mergedAnswers = { ...baseline, ...cloneServiceFormAnswers(draft?.answers ?? {}) };
      const draftExpandedSections = draft?.expandedSections ?? {};
      const initialSectionIds =
        typeof initialExpandedSectionIds === 'string'
          ? [initialExpandedSectionIds]
          : (initialExpandedSectionIds ?? []);
      const initialExpandedSections: Record<string, true> = {};
      initialSectionIds.forEach((sectionId) => {
        initialExpandedSections[sectionId] = true;
      });
      const expandedSections: Record<string, true> =
        Object.keys(draftExpandedSections).length > 0
          ? { ...draftExpandedSections }
          : initialExpandedSections;

      return set({
        answers: cloneServiceFormAnswers(mergedAnswers),
        initialAnswers: baseline,
        touched: {},
        errors: {},
        requiredFieldOverrides: {},
        expandedSections,
        recommendedFieldId: draft?.recommendedFieldId ?? null,
        hideSignature: { ...(draft?.hideSignature ?? {}) },
        noEmailConfirmation: { ...(draft?.noEmailConfirmation ?? {}) },
        acceptedTermsAndConditions: draft?.acceptedTermsAndConditions ?? !requiresTermsAcceptance,
        termsAcceptanceRequired: requiresTermsAcceptance,
      });
    },
    setAnswer: (fieldKey, answer) =>
      set((state) => ({ answers: { ...state.answers, [fieldKey]: answer } })),
    setAnswers: (answers) => set((state) => ({ answers: { ...state.answers, ...answers } })),
    setFieldsRequired: (fieldKeys, required) =>
      set((state) => {
        const current = state.requiredFieldOverrides;
        const wouldChange = fieldKeys.some((k) => (required ? !current[k] : Boolean(current[k])));
        if (!wouldChange) {
          // Same reference — Zustand skips notify. `return {}` would still replace state.
          return state;
        }
        const requiredFieldOverrides = { ...current };
        fieldKeys.forEach((fieldKey) => {
          if (required) {
            requiredFieldOverrides[fieldKey] = true;
          } else {
            delete requiredFieldOverrides[fieldKey];
          }
        });
        return { requiredFieldOverrides };
      }),
    touchField: (fieldKey) => set((state) => ({ touched: { ...state.touched, [fieldKey]: true } })),
    setFieldError: (fieldKey, error) =>
      set((state) => {
        const errors = { ...state.errors };
        if (error) {
          errors[fieldKey] = error;
        } else {
          delete errors[fieldKey];
        }
        return { errors };
      }),
    setErrors: (errors) => set({ errors: { ...errors } }),
    toggleSection: (sectionId) =>
      set((state) => {
        const expandedSections = { ...state.expandedSections };
        if (expandedSections[sectionId]) {
          delete expandedSections[sectionId];
        } else {
          expandedSections[sectionId] = true;
        }
        return { expandedSections };
      }),
    expandSection: (sectionId) =>
      set((state) => ({ expandedSections: { ...state.expandedSections, [sectionId]: true } })),
    setRecommendedFieldId: (recommendedFieldId) => set({ recommendedFieldId }),
    toggleHideSignature: (fieldKey) =>
      set((state) => {
        const hideSignature = { ...state.hideSignature };
        if (hideSignature[fieldKey]) {
          delete hideSignature[fieldKey];
        } else {
          hideSignature[fieldKey] = true;
        }
        const errors = { ...state.errors };
        delete errors[fieldKey];
        return { hideSignature, errors };
      }),
    toggleNoEmailConfirmation: (fieldKey) =>
      set((state) => {
        const noEmailConfirmation = { ...state.noEmailConfirmation };
        if (noEmailConfirmation[fieldKey]) {
          delete noEmailConfirmation[fieldKey];
        } else {
          noEmailConfirmation[fieldKey] = true;
        }
        const errors = { ...state.errors };
        delete errors[fieldKey];
        return { noEmailConfirmation, errors };
      }),
    setAcceptedTermsAndConditions: (accepted) => set({ acceptedTermsAndConditions: accepted }),
    reset: () =>
      set((state) => ({
        answers: cloneServiceFormAnswers(state.initialAnswers),
        touched: {},
        errors: {},
        requiredFieldOverrides: {},
        expandedSections: {},
        recommendedFieldId: null,
        hideSignature: {},
        noEmailConfirmation: {},
        acceptedTermsAndConditions: !state.termsAcceptanceRequired,
        uiResetEpoch: state.uiResetEpoch + 1,
      })),
    resetSection: (answers, fieldKeys) =>
      set((state) => {
        const touched = { ...state.touched };
        const errors = { ...state.errors };
        const hideSignature = { ...state.hideSignature };
        const noEmailConfirmation = { ...state.noEmailConfirmation };
        const requiredFieldOverrides = { ...state.requiredFieldOverrides };
        for (const key of fieldKeys) {
          delete touched[key];
          delete errors[key];
          delete hideSignature[key];
          delete noEmailConfirmation[key];
          delete requiredFieldOverrides[key];
        }
        return {
          answers: cloneServiceFormAnswers(answers),
          touched,
          errors,
          hideSignature,
          noEmailConfirmation,
          requiredFieldOverrides,
          uiResetEpoch: state.uiResetEpoch + 1,
        };
      }),
    reinitializeToBackend: (answers, initialExpandedSectionId, requiresTermsAcceptance = false) =>
      set({
        answers: cloneServiceFormAnswers(answers),
        initialAnswers: cloneServiceFormAnswers(answers),
        touched: {},
        errors: {},
        requiredFieldOverrides: {},
        expandedSections: initialExpandedSectionId ? { [initialExpandedSectionId]: true } : {},
        recommendedFieldId: null,
        hideSignature: {},
        noEmailConfirmation: {},
        acceptedTermsAndConditions: !requiresTermsAcceptance,
        termsAcceptanceRequired: requiresTermsAcceptance,
      }),
  }));

export type ServiceFormStore = ReturnType<typeof createServiceFormStore>;
