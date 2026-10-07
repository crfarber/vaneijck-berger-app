import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenFooter } from './screen-footer';
import { spacing } from './theme';

/**
 * A screen with a scrollable body. An optional footer sticks to the bottom and
 * owns the bottom safe area; without one, the SafeAreaView keeps that inset.
 * Top inset is skipped: the stack header already covers the status bar.
 * By default the stack's screen layout remains visible; flows can request an opaque background.
 */
export function Screen({
  children,
  footer,
  contentStyle,
  backgroundColor = 'transparent',
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** Merged onto the default padded content container (e.g. full-bleed lists). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Opaque page background for flows that must not reveal the stack screen layout. */
  backgroundColor?: string;
}) {
  const [footerHeight, setFooterHeight] = useState(0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={footer ? [] : ['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentStyle,
          footer ? { paddingBottom: footerHeight + spacing.md } : null,
        ]}
        scrollIndicatorInsets={{ bottom: footer ? footerHeight : 0 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={styles.footerOverlay}
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        >
          <ScreenFooter backgroundColor="rgba(255, 255, 255, 0.15)">{footer}</ScreenFooter>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  footerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
