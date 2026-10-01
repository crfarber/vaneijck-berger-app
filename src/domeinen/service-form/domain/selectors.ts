import type { ServiceFormVisibility } from './conditions';
import {
  isServiceFormFieldFilled,
  isServiceFormFieldRequired,
  validateServiceFormField,
} from './validation';
import type {
  NormalizedServiceForm,
  ServiceFormAnswers,
  ServiceFormField,
  ServiceFormRequiredOverrides,
  ServiceFormSection,
} from './types';

/** Derived views over the form (visible sections, progress, next task), ported from
 * `utils/serviceFormSelectors.ts`. */

export type ServiceFormProgress = {
  completed: number;
  total: number;
  remaining: number;
};

export function selectVisibleServiceFormSections(
  form: NormalizedServiceForm,
  visibility: ServiceFormVisibility,
): ServiceFormSection[] {
  return form.sections
    .filter((section) => visibility.visibleSectionIds.has(section.id))
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => visibility.visibleFieldIds.has(field.id)),
    }));
}

export function selectActiveServiceFormAnswers(
  fields: ServiceFormField[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
): ServiceFormAnswers {
  const activeAnswers: ServiceFormAnswers = {};
  fields.forEach((field) => {
    const answer = answers[field.key];
    if (visibleFieldIds.has(field.id) && answer) {
      activeAnswers[field.key] = answer;
    }
  });
  return activeAnswers;
}

export function selectRequiredServiceFormFields(
  fields: ServiceFormField[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
  requiredFieldOverrides: ServiceFormRequiredOverrides = {},
): ServiceFormField[] {
  return fields.filter(
    (field) =>
      visibleFieldIds.has(field.id) &&
      !field.readOnly &&
      isServiceFormFieldRequired(field, answers, requiredFieldOverrides),
  );
}

export type ServiceFormValidationContext = {
  requiredFieldOverrides?: ServiceFormRequiredOverrides;
  hideSignature?: Record<string, true>;
  noEmailConfirmation?: Record<string, true>;
};

export function selectServiceFormProgress(
  fields: ServiceFormField[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
  context: ServiceFormValidationContext = {},
): ServiceFormProgress {
  const { requiredFieldOverrides = {}, hideSignature = {}, noEmailConfirmation = {} } = context;
  const requiredFields = selectRequiredServiceFormFields(
    fields,
    visibleFieldIds,
    answers,
    requiredFieldOverrides,
  );
  const completed = requiredFields.filter(
    (field) =>
      validateServiceFormField(
        field,
        answers,
        requiredFieldOverrides,
        hideSignature,
        noEmailConfirmation,
      ) === null,
  ).length;
  return {
    completed,
    total: requiredFields.length,
    remaining: requiredFields.length - completed,
  };
}

export function selectNextIncompleteServiceFormField(
  fields: ServiceFormField[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
  context: ServiceFormValidationContext = {},
): ServiceFormField | null {
  const { requiredFieldOverrides = {}, hideSignature = {}, noEmailConfirmation = {} } = context;
  return (
    selectRequiredServiceFormFields(fields, visibleFieldIds, answers, requiredFieldOverrides).find(
      (field) =>
        validateServiceFormField(
          field,
          answers,
          requiredFieldOverrides,
          hideSignature,
          noEmailConfirmation,
        ) !== null,
    ) ?? null
  );
}

export type QuickViewContext = ServiceFormValidationContext & {
  /** Keep the currently focused field visible even if it just became filled. */
  focusedFieldId?: string | null;
};

/**
 * Fields still relevant in quick view: editable, not yet validly filled, plus the currently
 * focused field so it does not disappear mid-edit.
 */
export function selectQuickViewFields(
  fields: ServiceFormField[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
  context: QuickViewContext = {},
): ServiceFormField[] {
  const {
    requiredFieldOverrides = {},
    hideSignature = {},
    noEmailConfirmation = {},
    focusedFieldId = null,
  } = context;

  return fields.filter((field) => {
    if (!visibleFieldIds.has(field.id)) {
      return false;
    }
    if (field.readOnly) {
      return false;
    }
    if (focusedFieldId !== null && field.id === focusedFieldId) {
      return true;
    }
    return !isServiceFormFieldFilled(
      field,
      answers,
      requiredFieldOverrides,
      hideSignature,
      noEmailConfirmation,
    );
  });
}

export function selectQuickViewSections(
  sections: ServiceFormSection[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
  context: QuickViewContext = {},
): ServiceFormSection[] {
  return sections
    .map((section) => ({
      ...section,
      fields: selectQuickViewFields(section.fields, visibleFieldIds, answers, context),
    }))
    .filter((section) => section.fields.length > 0);
}

/** True when the berger has typed something that differs from the CRM starting values. */
export function isServiceFormDirty(
  initialAnswers: ServiceFormAnswers,
  answers: ServiceFormAnswers,
): boolean {
  const keys = new Set([...Object.keys(initialAnswers), ...Object.keys(answers)]);
  for (const key of keys) {
    const initial = initialAnswers[key];
    const current = answers[key];
    if (JSON.stringify(initial ?? null) !== JSON.stringify(current ?? null)) {
      return true;
    }
  }
  return false;
}
