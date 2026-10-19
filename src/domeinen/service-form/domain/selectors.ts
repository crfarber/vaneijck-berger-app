import type { ServiceFormVisibility } from './conditions';
import { FIELD_KIND, resolveFieldKind } from './field-kind';
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

export type ServiceFormFieldLayout = {
  fieldId: string;
  x: number;
  y: number;
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

export function selectNextVisibleServiceFormField(
  fields: ServiceFormField[],
  layouts: ServiceFormFieldLayout[],
  currentFieldId: string | null,
): ServiceFormField | null {
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const orderedFields = layouts
    .map((layout, index) => ({ field: fieldById.get(layout.fieldId), index, layout }))
    .filter(
      (
        entry,
      ): entry is {
        field: ServiceFormField;
        index: number;
        layout: ServiceFormFieldLayout;
      } => {
        if (entry.field === undefined || entry.field.readOnly) {
          return false;
        }
        const kind = resolveFieldKind(entry.field);
        return kind !== FIELD_KIND.date && kind !== FIELD_KIND.unsupported;
      },
    )
    .sort(
      (left, right) =>
        left.layout.y - right.layout.y ||
        left.layout.x - right.layout.x ||
        left.index - right.index,
    )
    .map((entry) => entry.field);

  if (currentFieldId === null) {
    return orderedFields[0] ?? null;
  }

  const currentIndex = orderedFields.findIndex((field) => field.id === currentFieldId);
  if (currentIndex < 0) {
    return orderedFields[0] ?? null;
  }
  return orderedFields[currentIndex + 1] ?? null;
}

export type QuickViewContext = ServiceFormValidationContext & {
  /** Backend answers before draft and in-session changes were applied. */
  initialAnswers?: ServiceFormAnswers;
  /** Keep the currently focused field visible even if it just became filled. */
  focusedFieldId?: string | null;
};

/**
 * Fields still relevant in quick view: editable, not yet validly filled, plus required fields
 * filled by the user and the currently focused field so it does not disappear mid-edit.
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
    initialAnswers,
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
    const isFilled = isServiceFormFieldFilled(
      field,
      answers,
      requiredFieldOverrides,
      hideSignature,
      noEmailConfirmation,
    );
    if (!isFilled) {
      return true;
    }
    if (
      initialAnswers === undefined ||
      !isServiceFormFieldRequired(field, answers, requiredFieldOverrides)
    ) {
      return false;
    }
    return !isServiceFormFieldFilled(
      field,
      initialAnswers,
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
