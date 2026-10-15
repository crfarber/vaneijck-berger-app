import type { ServiceFormField } from './types';

/**
 * Shared TanStack Query key for select options: quick-pick chips and "Meer opties…" must hit
 * the same cache so opening the sheet does not wait on a second GPS + table load.
 */
export function serviceFormSelectOptionsQueryKey(
  field: Pick<ServiceFormField, 'key' | 'table' | 'sortOptions'>,
  dependencyValue: unknown,
): readonly unknown[] {
  return [
    'service-form',
    'select-options',
    field.key,
    field.table,
    field.sortOptions?.orderby,
    field.sortOptions?.direction,
    dependencyValue,
  ] as const;
}
