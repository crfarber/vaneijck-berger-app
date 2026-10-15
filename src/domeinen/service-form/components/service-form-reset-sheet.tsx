import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { spacing } from '@/shared/ui/theme';
import type { ServiceFormSection } from '../domain/types';

/** Choose which dirty section (or the whole form) to restore to the CRM baseline. */
export function ServiceFormResetSheet({
  visible,
  dirtySections,
  onClose,
  onSelectSection,
  onSelectFullForm,
}: {
  visible: boolean;
  dirtySections: readonly ServiceFormSection[];
  onClose: () => void;
  onSelectSection: (section: ServiceFormSection) => void;
  onSelectFullForm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      visible={visible}
      title={t('serviceForm.reset.sheetTitle')}
      closeLabel={t('common.cancel')}
      onClose={onClose}
      fitContent
      maxHeight="50%"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        bounces={false}
        style={styles.list}
        contentContainerStyle={styles.actions}
      >
        {dirtySections.map((section) => (
          <Button
            key={section.id}
            label={t('serviceForm.reset.sectionOption', { title: section.title })}
            variant="secondary"
            onPress={() => onSelectSection(section)}
          />
        ))}
        <Button
          label={t('serviceForm.reset.fullFormOption')}
          variant="danger"
          onPress={onSelectFullForm}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 0, flexShrink: 1 },
  actions: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
