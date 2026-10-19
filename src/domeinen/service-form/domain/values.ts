import type { ServiceFormAnswer, ServiceFormAnswers, ServiceFormField } from './types';

/** Ported verbatim from `utils/serviceFormValues.ts` — behaviour, not just shape. */

const isDecimal = (type: string): boolean => type.toLowerCase() === 'decimal';
const isSelect = (type: string): boolean => type.toLowerCase() === 'select';
const isSignature = (type: string): boolean => type.toLowerCase() === 'signature';

export const isBooleanSelectField = (field: ServiceFormField): boolean =>
  isSelect(field.type) &&
  (field.table === 'dn_truefalse' || field.table?.includes('optionalyesno') === true);

const formatDecimal = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return '00.00';
  }

  const decimal = String(value);
  return decimal.includes('.') ? decimal : `${decimal}.00`;
};

const resolveDisplayKey = (field: ServiceFormField): string => {
  let displayKey = field.autoformValue ?? field.key;
  if (displayKey === 'dn_locations' && field.raw.label?.[0]?.value === 'Depot') {
    displayKey = field.key;
  }
  return displayKey;
};

/**
 * Mirrors legacy `buildAnswerEntry`: a field is only pre-filled when CRM exposes a display value
 * (`valueToShow !== null`). Raw option ids / 0|1 without a formatted label are treated as empty so
 * toggles do not look filled.
 */
export function resolveServiceFormValueToShow(
  field: ServiceFormField,
  values: Record<string, unknown>,
): unknown {
  const displayKey = resolveDisplayKey(field);
  const formattedValue = values[`${field.key}@OData.Community.Display.V1.FormattedValue`];

  if (isBooleanSelectField(field)) {
    if (
      formattedValue !== null &&
      formattedValue !== undefined &&
      String(formattedValue).trim() !== ''
    ) {
      return formattedValue;
    }
    return undefined;
  }

  if (isSelect(field.type)) {
    return formattedValue ?? values[displayKey];
  }

  return values[displayKey];
}

export function buildEmptyServiceFormAnswer(
  field: ServiceFormField,
  pleaseSelectLabel: string,
): ServiceFormAnswer {
  if (isSelect(field.type)) {
    return {
      value: '',
      displayValue: pleaseSelectLabel,
      table: field.table,
      ...(isSignature(field.type) ? { email: '', signatureName: '' } : {}),
    };
  }

  if (isDecimal(field.type)) {
    return {
      value: '',
      displayValue: '00.00',
      table: field.table,
    };
  }

  return {
    value: '',
    displayValue: '',
    table: field.table,
    ...(isSignature(field.type) ? { email: '', signatureName: '' } : {}),
  };
}

export function buildInitialServiceFormAnswer(
  field: ServiceFormField,
  values: Record<string, unknown>,
  pleaseSelectLabel: string,
): ServiceFormAnswer {
  const rawValue = values[field.key];
  const valueToShow = resolveServiceFormValueToShow(field, values);

  if (valueToShow !== null && valueToShow !== undefined) {
    let displayValue: unknown = valueToShow;
    if (isDecimal(field.type)) {
      displayValue = formatDecimal(valueToShow);
    }

    return {
      value: rawValue ?? '',
      displayValue,
      table: field.table,
      ...(isSignature(field.type) ? { email: '', signatureName: '' } : {}),
    };
  }

  return buildEmptyServiceFormAnswer(field, pleaseSelectLabel);
}

export function buildInitialServiceFormAnswers(
  fields: ServiceFormField[],
  values: Record<string, unknown>,
  pleaseSelectLabel: string,
): ServiceFormAnswers {
  const answers: ServiceFormAnswers = {};

  fields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(answers, field.key)) {
      answers[field.key] = buildInitialServiceFormAnswer(field, values, pleaseSelectLabel);
    }
  });

  return answers;
}

export function cloneServiceFormAnswer(answer: ServiceFormAnswer): ServiceFormAnswer {
  return { ...answer };
}

export function cloneServiceFormAnswers(answers: ServiceFormAnswers): ServiceFormAnswers {
  const cloned: ServiceFormAnswers = {};
  Object.entries(answers).forEach(([fieldKey, answer]) => {
    cloned[fieldKey] = cloneServiceFormAnswer(answer);
  });
  return cloned;
}

export function resolvePhaseOneServiceFormAnswers(
  currentAnswers: ServiceFormAnswers,
  snapshot: ServiceFormAnswers | null,
): ServiceFormAnswers {
  return cloneServiceFormAnswers(snapshot ?? currentAnswers);
}
