import type { ServiceFormField } from './types';

/** URL for the signature field's transport-conditions link, if configured. */
export function resolveTransportConditionsUrl(field: ServiceFormField): string | null {
  const url = field.raw.subFields?.transportConditions?.url;
  if (typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  return trimmed === '' ? null : trimmed;
}

export function hasTransportConditions(field: ServiceFormField): boolean {
  return Boolean(field.raw.subFields?.transportConditions);
}
