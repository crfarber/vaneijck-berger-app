import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useDevUiToolsEnabled } from '@/domeinen/settings/ui';
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
 * Metro-only toggle (off until enabled on the debug screen) that shows the CRM
 * answers for one compact group as a read-only label/value list.
 */
export function DevGroupAnswersButton({ answers, fields }: DevGroupAnswersButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const uiToolsEnabled = useDevUiToolsEnabled();

  const debugFields = useMemo(() => fieldsForGroupAnswersDebug(fields), [fields]);
  const debugAnswers = useMemo(
    () =>
      pickGroupAnswersForDebug(
        answers,
        debugFields.map((field) => field.key),
      ),
    [answers, debugFields],
  );

  if (!uiToolsEnabled) {
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
