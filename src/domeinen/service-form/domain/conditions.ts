import type {
  NormalizedServiceForm,
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormCondition,
  ServiceFormDiagnostic,
  ServiceFormField,
} from './types';

/**
 * Field visibility, ported from `utils/serviceFormConditions.ts`. Controllers are found form-wide
 * by `field.key`, independent of which legacy "tab" either field is in — the old app's own
 * `checkRequiredVisibility` did the same lookup ad hoc, per render; this makes it one pure,
 * memoizable pass with cycle detection.
 */

export type ServiceFormVisibility = {
  visibleFieldIds: Set<string>;
  visibleSectionIds: Set<string>;
  diagnostics: ServiceFormDiagnostic[];
};

const normalizeComparable = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return value;
};

const expectedValues = (condition: ServiceFormCondition, answer: ServiceFormAnswer): unknown[] => {
  const values = Array.isArray(condition.value) ? condition.value : [condition.value];

  return values.map((value) => {
    if (typeof value !== 'boolean') {
      return normalizeComparable(value);
    }

    if (answer.table === 'dn_truefalse') {
      return value;
    }

    return value ? 1 : 0;
  });
};

export function isServiceFormConditionMet(
  condition: ServiceFormCondition,
  answers: ServiceFormAnswers,
): boolean {
  const answer = answers[condition.property];
  if (!answer) {
    return false;
  }

  const actualValue = normalizeComparable(answer.value);
  return expectedValues(condition, answer).some((expectedValue) => actualValue === expectedValue);
}

export function evaluateServiceFormVisibility(
  form: NormalizedServiceForm,
  answers: ServiceFormAnswers,
): ServiceFormVisibility {
  const allFields = form.sections.flatMap((section) => section.fields);
  const fieldsByKey = new Map<string, ServiceFormField>();
  allFields.forEach((field) => {
    if (!fieldsByKey.has(field.key)) {
      fieldsByKey.set(field.key, field);
    }
  });

  const visibilityById = new Map<string, boolean>();
  const diagnostics: ServiceFormDiagnostic[] = [];
  const diagnosticKeys = new Set<string>();

  const addDiagnostic = (diagnostic: ServiceFormDiagnostic): void => {
    const key = `${diagnostic.code}:${diagnostic.fieldId ?? ''}:${diagnostic.fieldKey ?? ''}`;
    if (!diagnosticKeys.has(key)) {
      diagnosticKeys.add(key);
      diagnostics.push(diagnostic);
    }
  };

  const isVisible = (field: ServiceFormField, path: Set<string>): boolean => {
    const cached = visibilityById.get(field.id);
    if (cached !== undefined) {
      return cached;
    }

    if (path.has(field.id)) {
      addDiagnostic({
        code: 'condition-cycle',
        fieldId: field.id,
        fieldKey: field.key,
        message: `Conditional visibility cycle detected at ${field.key}.`,
      });
      visibilityById.set(field.id, false);
      return false;
    }

    const condition = field.requiredVisibility;
    if (!condition) {
      visibilityById.set(field.id, true);
      return true;
    }

    const controller = fieldsByKey.get(condition.property);
    if (!controller) {
      addDiagnostic({
        code: 'missing-condition-controller',
        fieldId: field.id,
        fieldKey: condition.property,
        message: `Conditional controller ${condition.property} was not found.`,
      });
      visibilityById.set(field.id, false);
      return false;
    }

    const nextPath = new Set(path);
    nextPath.add(field.id);
    const visible =
      isVisible(controller, nextPath) && isServiceFormConditionMet(condition, answers);
    visibilityById.set(field.id, visible);
    return visible;
  };

  const visibleFieldIds = new Set<string>();
  allFields.forEach((field) => {
    if (isVisible(field, new Set())) {
      visibleFieldIds.add(field.id);
    }
  });

  const visibleSectionIds = new Set(
    form.sections
      .filter(
        (section) =>
          section.contractRights.length > 0 ||
          section.fields.some((field) => visibleFieldIds.has(field.id)),
      )
      .map((section) => section.id),
  );

  return { visibleFieldIds, visibleSectionIds, diagnostics };
}
