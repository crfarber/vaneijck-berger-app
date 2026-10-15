import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignatureInk, type SignatureInkHandle } from 'react-native-signature-ink';
import { hasSignatureInk, toJpegDataUrl } from '@/domeinen/signatures';
import { Button } from '@/shared/ui/button';
import { colors, spacing, type } from '@/shared/ui/theme';

export function SignatureCaptureSheet({
  visible,
  onCapture,
  onClose,
}: {
  visible: boolean;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {visible ? <SignatureCaptureBody onCapture={onCapture} onClose={onClose} /> : null}
    </Modal>
  );
}

function SignatureCaptureBody({
  onCapture,
  onClose,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<SignatureInkHandle>(null);
  const [saving, setSaving] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleSave = async (): Promise<void> => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      const empty = await ref.current?.isEmpty();
      if (empty !== false) {
        Alert.alert(t('serviceForm.signature.captureTitle'), t('serviceForm.signature.empty'));
        return;
      }
      const raw = await ref.current?.toBase64({ format: 'jpeg', quality: 0.92, trim: false });
      if (raw === undefined || raw.length === 0) {
        Alert.alert(t('serviceForm.signature.captureTitle'), t('serviceForm.signature.empty'));
        return;
      }
      const dataUrl = toJpegDataUrl(raw);
      if (!hasSignatureInk(dataUrl)) {
        Alert.alert(t('serviceForm.signature.captureTitle'), t('serviceForm.signature.empty'));
        return;
      }
      onCapture(dataUrl);
    } catch {
      Alert.alert(t('serviceForm.signature.captureTitle'), t('serviceForm.signature.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('serviceForm.signature.captureTitle')}</Text>
        <Button label={t('serviceForm.select.close')} variant="secondary" onPress={onClose} />
      </View>
      <View style={styles.pad}>
        <SignatureInk
          ref={ref}
          style={styles.ink}
          backgroundColor={colors.background}
          penColor={colors.text}
          penMinWidth={1.5}
          penMaxWidth={4}
          showToolbar={false}
          showBaseline
          baselineColor={colors.border}
          onChange={(event) => setIsEmpty(event.isEmpty)}
        />
      </View>
      <View style={styles.footer}>
        <View style={styles.row}>
          <View style={styles.half}>
            <Button
              label={t('serviceForm.signature.undo')}
              variant="secondary"
              disabled={isEmpty}
              onPress={() => ref.current?.undo()}
            />
          </View>
          <View style={styles.half}>
            <Button
              label={t('serviceForm.signature.clear')}
              variant="secondary"
              disabled={isEmpty}
              onPress={() => ref.current?.clear()}
            />
          </View>
        </View>
        <Button
          label={t('serviceForm.signature.save')}
          loading={saving}
          disabled={isEmpty}
          onPress={() => {
            void handleSave();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { ...type.large, color: colors.text },
  pad: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  ink: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
