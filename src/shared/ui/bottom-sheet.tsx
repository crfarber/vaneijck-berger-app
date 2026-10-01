import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from './theme';

/**
 * Generic bottom sheet: dimmed backdrop, sliding panel, title and a close control.
 * Domain sheets (select, service decline) compose on top of this.
 */
export function BottomSheet({
  visible,
  title,
  closeLabel,
  onClose,
  children,
  footer,
  height,
}: {
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  height?: `${number}%` | number;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <SafeAreaView
          style={[styles.sheet, height !== undefined ? { maxHeight: height } : styles.maxHeight]}
          edges={['bottom']}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={spacing.md}>
              <Text style={styles.closeLabel}>{closeLabel}</Text>
            </Pressable>
          </View>
          <View style={styles.body}>{children}</View>
          {footer !== undefined ? <View style={styles.footer}>{footer}</View> : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
    width: '100%',
  },
  maxHeight: { maxHeight: '80%' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  closeLabel: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  body: { flexShrink: 1 },
  footer: { paddingVertical: spacing.md, gap: spacing.sm },
});
