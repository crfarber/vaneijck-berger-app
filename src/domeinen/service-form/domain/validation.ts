import { isServiceFormConditionMet } from './conditions';
import type {
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormError,
  ServiceFormErrors,
  ServiceFormField,
  ServiceFormRequiredOverrides,
} from './types';

/** Field-level validation, ported from `utils/serviceFormValidation.ts`. */

export function isServiceFormAnswerEmpty(answer: ServiceFormAnswer | undefined): boolean {
  return (
    answer === undefined ||
    answer.value === null ||
    answer.value === undefined ||
    answer.value === '' ||
    answer.displayValue === '00.00' ||
    answer.displayValue === '0.00'
  );
}

const isEmpty = isServiceFormAnswerEmpty;

/**
 * Whether a field has a valid completed answer (or a skipped signature). Empty optional fields
 * are not filled — they still appear in quick view.
 */
export function isServiceFormFieldFilled(
  field: ServiceFormField,
  answers: ServiceFormAnswers,
  requiredFieldOverrides: ServiceFormRequiredOverrides = {},
  hideSignature: Record<string, true> = {},
  noEmailConfirmation: Record<string, true> = {},
): boolean {
  if (field.readOnly) {
    return true;
  }

  if (field.type.toLowerCase() === 'signature' && hideSignature[field.key]) {
    return true;
  }

  const answer = answers[field.key];
  if (isEmpty(answer)) {
    return false;
  }

  return (
    validateServiceFormField(
      field,
      answers,
      requiredFieldOverrides,
      hideSignature,
      noEmailConfirmation,
    ) === null
  );
}

export function isServiceFormFieldRequired(
  field: ServiceFormField,
  answers: ServiceFormAnswers,
  requiredFieldOverrides: ServiceFormRequiredOverrides = {},
): boolean {
  if (requiredFieldOverrides[field.key]) {
    return true;
  }

  if (!field.requiredWhen) {
    return !field.optional;
  }

  return isServiceFormConditionMet(
    { property: field.requiredWhen.field, value: field.requiredWhen.value },
    answers,
  );
}

/**
 * Whether a signature field's "not available" toggle may be shown, mirroring legacy `canSkip`:
 * skippable by default, unless the field's `requiredwhen` condition is currently met (i.e. it
 * just became mandatory).
 */
export function isSignatureSkippable(
  field: ServiceFormField,
  answers: ServiceFormAnswers,
): boolean {
  if (!field.requiredWhen) {
    return true;
  }

  return !isServiceFormConditionMet(
    { property: field.requiredWhen.field, value: field.requiredWhen.value },
    answers,
  );
}

export function validateServiceFormField(
  field: ServiceFormField,
  answers: ServiceFormAnswers,
  requiredFieldOverrides: ServiceFormRequiredOverrides = {},
  hideSignature: Record<string, true> = {},
  noEmailConfirmation: Record<string, true> = {},
): ServiceFormError | null {
  if (field.readOnly) {
    return null;
  }

  if (field.type.toLowerCase() === 'signature' && hideSignature[field.key]) {
    return null;
  }

  const answer = answers[field.key];
  if (isServiceFormFieldRequired(field, answers, requiredFieldOverrides) && isEmpty(answer)) {
    return { code: 'required', message: 'Dit veld is verplicht.' };
  }

  if (isEmpty(answer)) {
    return null;
  }

  if (field.type.toLowerCase() === 'signature') {
    const subFields = field.raw.subFields;
    if (subFields?.name && !answer?.signatureName?.trim()) {
      return { code: 'signature-name-required', message: 'Naam bij de handtekening is verplicht.' };
    }
    if (subFields?.email && !noEmailConfirmation[field.key] && !answer?.email?.trim()) {
      return {
        code: 'signature-email-required',
        message: 'E-mailadres bij de handtekening is verplicht.',
      };
    }
  }

  for (const validation of field.validations) {
    const limit = Number(validation.value);
    if (!Number.isFinite(limit)) {
      continue;
    }

    if (
      validation.validation_type === 'max-len' &&
      String(answer?.displayValue ?? '').length > limit
    ) {
      return { code: 'max-length', message: `Gebruik maximaal ${limit} tekens.`, limit };
    }

    const numericValue = Number(answer?.value || answer?.displayValue);
    if (validation.validation_type === 'max-int' && numericValue > limit) {
      return { code: 'max-value', message: `Waarde mag maximaal ${limit} zijn.`, limit };
    }
    if (validation.validation_type === 'min-int' && numericValue < limit) {
      return { code: 'min-value', message: `Waarde moet minimaal ${limit} zijn.`, limit };
    }
  }

  return null;
}

export function validateVisibleServiceForm(
  fields: ServiceFormField[],
  visibleFieldIds: Set<string>,
  answers: ServiceFormAnswers,
  requiredFieldOverrides: ServiceFormRequiredOverrides = {},
  hideSignature: Record<string, true> = {},
  noEmailConfirmation: Record<string, true> = {},
): ServiceFormErrors {
  const errors: ServiceFormErrors = {};
  fields.forEach((field) => {
    if (!visibleFieldIds.has(field.id)) {
      return;
    }
    const error = validateServiceFormField(
      field,
      answers,
      requiredFieldOverrides,
      hideSignature,
      noEmailConfirmation,
    );
    if (error) {
      errors[field.key] = error;
    }
  });

  return errors;
}
