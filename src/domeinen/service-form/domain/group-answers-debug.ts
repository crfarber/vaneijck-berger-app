import type { ServiceFormAnswers, ServiceFormField } from './types';

/**
 * Deduplicates group fields (anchor + ordered + mapping) and labels them with the
 * CRM key so a __DEV__ inspector can verify what the compact group wrote.
 */
export function fieldsForGroupAnswersDebug(
  fields: readonly ServiceFormField[],
): ServiceFormField[] {
  const seen = new Set<string>();
  const result: ServiceFormField[] = [];
  for (const field of fields) {
    const key = field.key.trim();
    if (key === '' || seen.has(key)) {
      continue;
    }
    seen.add(key);
    const label = field.label.trim() === '' ? key : `${field.label} (${key})`;
    result.push({ ...field, label });
  }
  result.sort((a, b) => (a.key > b.key ? 1 : a.key < b.key ? -1 : 0));
  return result;
}

/**
 * Picks the answers for the given CRM field keys so a __DEV__ inspector can show
 * exactly what a compact group wrote, including empty slots for linked but unset fields.
 */
export function pickGroupAnswersForDebug(
  answers: ServiceFormAnswers,
  fieldKeys: readonly string[],
): ServiceFormAnswers {
  const picked: ServiceFormAnswers = {};
  const seen = new Set<string>();
  for (const key of fieldKeys) {
    const trimmed = key.trim();
    if (trimmed === '' || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    picked[trimmed] = answers[trimmed] ?? { value: '', displayValue: '' };
  }
  return picked;
}
