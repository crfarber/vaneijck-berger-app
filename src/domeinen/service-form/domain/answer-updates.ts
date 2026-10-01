import type { ServiceFormAnswer, ServiceFormAnswers, ServiceFormField } from './types';
import { buildEmptyServiceFormAnswer } from './values';

/**
 * Parent answer change plus empty answers for every field whose `dependencies.required` points at
 * that parent. Same brand re-selected (same `value`) leaves dependents alone — like the legacy
 * kenteken group, but driven by the schema instead of hardcoded keys.
 */
export function answersAfterParentChange(
  fields: readonly ServiceFormField[],
  answers: ServiceFormAnswers,
  fieldKey: string,
  newAnswer: ServiceFormAnswer,
  pleaseSelectLabel: string,
): ServiceFormAnswers {
  const updates: ServiceFormAnswers = { [fieldKey]: newAnswer };
  const previous = answers[fieldKey];
  if (previous?.value === newAnswer.value) {
    return updates;
  }

  for (const field of fields) {
    if (field.dependencies?.required === fieldKey) {
      updates[field.key] = buildEmptyServiceFormAnswer(field, pleaseSelectLabel);
    }
  }
  return updates;
}
