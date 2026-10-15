import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { serviceFormSelectOptionsQueryKey } from '../domain/select-options-query-key';
import { selectedOptionAnswer, type SelectOption } from '../domain/select-options';
import type { ServiceFormAnswer, ServiceFormField } from '../domain/types';
import { useServiceFormService } from './service-form-context';

/**
 * Opening a select field: load the synced table (or reuse the quick-picks cache), stop with a
 * message when the brand is missing or the table is empty, otherwise show the list. The chosen
 * option carries its own CRM value, so nothing is looked up again by label.
 */
export function useServiceFormSelectOption({
  field,
  dependencyValue,
  onSelect,
}: {
  field: ServiceFormField;
  dependencyValue: unknown;
  onSelect: (answer: ServiceFormAnswer) => void;
}) {
  const { t } = useTranslation();
  const service = useServiceFormService();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SelectOption[] | null>(null);

  const open = async (): Promise<void> => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const result = await queryClient.ensureQueryData({
        queryKey: serviceFormSelectOptionsQueryKey(field, dependencyValue),
        queryFn: () =>
          service.loadSelectOptions({
            table: field.table,
            sortOptions: field.sortOptions,
            dependencyValue,
          }),
      });
      if (result.kind === 'needs-dependency') {
        Alert.alert(field.label, t('serviceForm.select.needsDependency'));
      } else if (result.kind === 'empty') {
        Alert.alert(field.label, t('serviceForm.select.empty'));
      } else {
        setOptions(result.options);
      }
    } catch {
      Alert.alert(field.label, t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  const close = (): void => setOptions(null);

  const choose = (option: SelectOption): void => {
    setOptions(null);
    onSelect(selectedOptionAnswer(option, field.table));
  };

  return { open, close, choose, loading, options };
}
