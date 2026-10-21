import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { selectPrefetchableSelectFields } from '../domain/prefetch-select-fields';
import { serviceFormSelectOptionsQueryKey } from '../domain/select-options-query-key';
import type { NormalizedServiceForm } from '../domain/types';
import { useServiceFormService } from './service-form-context';

/**
 * Warms the shared select-options cache (quick picks + sheet) as soon as the form is ready,
 * including fields that are still hidden behind a condition (e.g. depot after settlement code).
 */
export function usePrefetchServiceFormSelectOptions(form: NormalizedServiceForm): void {
  const service = useServiceFormService();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fields = selectPrefetchableSelectFields(form);
    for (const field of fields) {
      void queryClient.prefetchQuery({
        queryKey: serviceFormSelectOptionsQueryKey(field, undefined),
        queryFn: () =>
          service.loadSelectOptions({
            table: field.table,
            sortOptions: field.sortOptions,
          }),
      });
    }
  }, [form, queryClient, service]);
}
