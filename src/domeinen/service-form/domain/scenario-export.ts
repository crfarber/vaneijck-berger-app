import type { NormalizedServiceForm, ServiceFormAnswer, ServiceFormAnswers } from './types';

export type ServiceFormScenario = {
  version: 1;
  phase: number;
  serviceCode: number;
  form: NormalizedServiceForm;
  answers: ServiceFormAnswers;
  submission: Record<string, unknown>;
};

const PERSONAL_FIELD =
  /address|adres|city|country|email|firstname|lastname|initials|middlename|name$|phone|postal|street|signature/i;

const redactAnswer = (fieldKey: string, answer: ServiceFormAnswer): ServiceFormAnswer => {
  if (!PERSONAL_FIELD.test(fieldKey)) {
    return answer;
  }

  return {
    ...answer,
    value: typeof answer.value === 'string' && answer.value !== '' ? '[test value]' : answer.value,
    displayValue:
      typeof answer.displayValue === 'string' && answer.displayValue !== ''
        ? '[test value]'
        : answer.displayValue,
    email:
      answer.email === undefined || answer.email === '' ? answer.email : '[test@example.invalid]',
    signatureName:
      answer.signatureName === undefined || answer.signatureName === ''
        ? answer.signatureName
        : '[Test user]',
  };
};

export function createServiceFormScenario(
  form: NormalizedServiceForm,
  answers: ServiceFormAnswers,
  submission: Record<string, unknown>,
): ServiceFormScenario {
  return {
    version: 1,
    phase: form.phase,
    serviceCode: form.serviceCode,
    form,
    answers: Object.fromEntries(
      Object.entries(answers).map(([fieldKey, answer]) => [
        fieldKey,
        redactAnswer(fieldKey, answer),
      ]),
    ),
    submission: Object.fromEntries(
      Object.entries(submission).map(([fieldKey, value]) => [
        fieldKey,
        typeof value === 'string' && PERSONAL_FIELD.test(fieldKey) ? '[test value]' : value,
      ]),
    ),
  };
}
