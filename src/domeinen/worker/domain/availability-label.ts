import type { AvailabilityFallbackKey, AvailabilityOption } from './availability';
import { availabilityFallbackKey } from './availability';

export type ResolvedAvailabilityLabel =
  | { kind: 'text'; text: string }
  | { kind: 'fallback'; key: AvailabilityFallbackKey }
  | { kind: 'unknown' };

/**
 * Prefer the CRM label from reference data; fall back to a known i18n key; otherwise unknown.
 */
export function resolveAvailabilityLabel(
  code: number | null | undefined,
  options: readonly AvailabilityOption[],
): ResolvedAvailabilityLabel {
  if (code !== null && code !== undefined) {
    const fromOptions = options.find((option) => option.value === code);
    if (fromOptions) {
      return { kind: 'text', text: fromOptions.text };
    }
  }
  const key = availabilityFallbackKey(code);
  if (key !== null) {
    return { kind: 'fallback', key };
  }
  return { kind: 'unknown' };
}
