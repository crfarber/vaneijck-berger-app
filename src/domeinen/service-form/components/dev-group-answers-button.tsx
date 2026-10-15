import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { spacing } from '@/shared/ui/theme';
import {
  fieldsForGroupAnswersDebug,
  pickGroupAnswersForDebug,
} from '../domain/group-answers-debug';
import type { ServiceFormAnswers, ServiceFormField } from '../domain/types';
import { ReadonlyFieldSummary } from './readonly-field-summary';

type DevGroupAnswersButtonProps = {
  answers: ServiceFormAnswers;
  fields: readonly ServiceFormField[];
};

/**
 * __DEV__-only toggle that shows the CRM answers for one compact group as a
 * read-only label/value list, so a berger/dev can verify the group wrote the
 * expected fields.
 */
export function DevGroupAnswersButton({ answers, fields }: DevGroupAnswersButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const debugFields = useMemo(() => fieldsForGroupAnswersDebug(fields), [fields]);
  const debugAnswers = useMemo(
    () =>
      pickGroupAnswersForDebug(
        answers,
        debugFields.map((field) => field.key),
      ),
    [answers, debugFields],
  );

  if (typeof __DEV__ !== 'boolean' || !__DEV__) {
    return null;
  }

  if (debugFields.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Button
        label={t(
          open ? 'serviceForm.actions.hideGroupAnswers' : 'serviceForm.actions.showGroupAnswers',
        )}
        variant="text"
        onPress={() => setOpen((current) => !current)}
      />
      {open ? <ReadonlyFieldSummary fields={debugFields} answers={debugAnswers} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
});
