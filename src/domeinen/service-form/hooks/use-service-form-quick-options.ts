import { useQuery } from '@tanstack/react-query';
import { serviceFormSelectOptionsQueryKey } from '../domain/select-options-query-key';
import { pickQuickOptions, type SelectOption } from '../domain/select-options';
import type { ServiceFormField } from '../domain/types';
import { useServiceFormService } from './service-form-context';

/**
 * Loads select options for fields with `autoform.quickPicks`, so the first N
 * (already sorted by the service) can be shown as chips without opening the sheet.
 * Uses the same query key as "Meer opties…" so the sheet reuses this cache.
 */
export function useServiceFormQuickOptions({
  field,
  dependencyValue,
  selectedValue,
}: {
  field: ServiceFormField;
  dependencyValue: unknown;
  selectedValue: unknown;
}): { quickOptions: SelectOption[]; isLoading: boolean } {
  const service = useServiceFormService();
  const enabled = Boolean(field.quickPicks && field.quickPicks > 0 && field.table);

  const query = useQuery({
    queryKey: serviceFormSelectOptionsQueryKey(field, dependencyValue),
    queryFn: () =>
      service.loadSelectOptions({
        table: field.table,
        sortOptions: field.sortOptions,
        dependencyValue,
      }),
    enabled,
  });

  const count = field.quickPicks ?? 0;
  const options = query.data?.kind === 'options' ? query.data.options : [];
  const quickOptions = enabled && count > 0 ? pickQuickOptions(options, count, selectedValue) : [];

  return { quickOptions, isLoading: enabled && query.isLoading };
}
