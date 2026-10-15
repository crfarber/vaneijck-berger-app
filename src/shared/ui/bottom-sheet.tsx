import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type KeyboardEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  keyboardOverlap,
  sheetSizeAboveKeyboard,
  sheetSizeToPixels,
  type SheetSize,
} from './sheet-keyboard';
import { colors, radius, spacing } from './theme';

/**
 * Top of the keyboard while this sheet is open. `undefined` until the first observation,
 * `null` once the keyboard is known to be hidden.
 */
function useKeyboardScreenY(visible: boolean): number | null {
  const [screenY, setScreenY] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const showEvents =
      Platform.OS === 'ios'
        ? (['keyboardWillShow', 'keyboardDidShow'] as const)
        : (['keyboardDidShow'] as const);
    const hideEvents =
      Platform.OS === 'ios'
        ? (['keyboardWillHide', 'keyboardDidHide'] as const)
        : (['keyboardDidHide'] as const);
    const show = showEvents.map((eventName) =>
      Keyboard.addListener(eventName, (event: KeyboardEvent) => {
        Keyboard.scheduleLayoutAnimation(event);
        setScreenY(event.endCoordinates.screenY);
      }),
    );
    const hide = hideEvents.map((eventName) =>
      Keyboard.addListener(eventName, (event: KeyboardEvent) => {
        Keyboard.scheduleLayoutAnimation(event);
        setScreenY(null);
      }),
    );

    return () => {
      for (const subscription of [...show, ...hide]) {
        subscription.remove();
      }
      setScreenY(undefined);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }
  if (screenY !== undefined) {
    return screenY;
  }
  return Keyboard.metrics()?.screenY ?? null;
}

/**
 * Generic bottom sheet: dimmed backdrop, sliding panel, title and a close control.
 * Domain sheets (select, service decline) compose on top of this.
 * The panel lifts above the keyboard so a search field does not cover the choices.
 */
export function BottomSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
  footer,
  height,
  maxHeight = '80%',
  fitContent = false,
}: {
  visible: boolean;
  title: string;
  /** Optional line(s) under the title, e.g. last-updated timestamps. */
  subtitle?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  height?: SheetSize;
  /** Cap for content-sized sheets (`fitContent`) and sheets without a fixed `height`. */
  maxHeight?: SheetSize;
  /**
   * Size the panel to its content (capped by `maxHeight` and keyboard space) instead of a
   * fixed height. Keyboard open does not stretch the sheet; it only lifts it.
   */
  fitContent?: boolean;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardScreenY = useKeyboardScreenY(visible);
  const keyboardInset = keyboardOverlap(windowHeight, keyboardScreenY);
  const aboveKeyboard = keyboardInset > 0;
  const limit = sheetSizeAboveKeyboard({
    windowHeight,
    keyboardInset,
    topInset: insets.top,
    requested: height,
  });
  const sized = height !== undefined && !fitContent;
  const fill = sized || (!fitContent && aboveKeyboard);
  const topInset = Math.max(0, insets.top);
  const bottomInset = Math.max(0, insets.bottom);
  /** Space the sheet may occupy without covering the top notch / status bar (or keyboard). */
  const availableForSheet = Math.max(
    0,
    windowHeight - topInset - (aboveKeyboard ? keyboardInset : 0),
  );
  const contentMaxHeightPx = Math.min(
    sheetSizeToPixels(maxHeight, windowHeight),
    availableForSheet,
  );
  const contentMaxHeight =
    fitContent || !fill
      ? aboveKeyboard || fitContent
        ? contentMaxHeightPx
        : maxHeight
      : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <SafeAreaView
          style={[
            styles.sheet,
            aboveKeyboard ? { marginBottom: keyboardInset } : null,
            // Explicit bottom inset (Modal + overflow:hidden); keep rows above the home indicator.
            { paddingBottom: aboveKeyboard ? spacing.sm : bottomInset, overflow: 'hidden' },
            fill ? { height: limit, maxHeight: limit } : { maxHeight: contentMaxHeight },
          ]}
          edges={[]}
        >
          <View style={fill ? styles.sheetColumn : styles.fitContentColumn}>
            <View style={styles.sheetHeader}>
              <View style={styles.titleBlock}>
                <Text style={styles.sheetTitle}>{title}</Text>
                {subtitle !== undefined && subtitle !== null ? (
                  typeof subtitle === 'string' || typeof subtitle === 'number' ? (
                    <Text style={styles.sheetSubtitle}>{subtitle}</Text>
                  ) : (
                    subtitle
                  )
                ) : null}
              </View>
              <Pressable accessibilityRole="button" onPress={onClose} hitSlop={spacing.md}>
                <Text style={styles.closeLabel}>{closeLabel}</Text>
              </Pressable>
            </View>
            <View style={[styles.body, fill ? styles.bodySized : styles.bodyFitContent]}>
              {children}
            </View>
            {footer !== undefined ? <View style={styles.footer}>{footer}</View> : null}
          </View>
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
  sheetColumn: { flex: 1 },
  fitContentColumn: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  titleBlock: { flex: 1, gap: spacing.xs },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sheetSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  closeLabel: { color: colors.textMuted, fontSize: 16, fontWeight: '600', marginTop: 2 },
  body: { flexShrink: 1, minHeight: 0 },
  bodySized: { flex: 1, minHeight: 0 },
  bodyFitContent: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  footer: { paddingVertical: spacing.md, gap: spacing.sm },
});
