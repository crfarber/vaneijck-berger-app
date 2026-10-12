import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/shared/ui/screen';
import { colors, spacing } from '@/shared/ui/theme';

/** Shared chrome for external and internal unit registration: hero, body, sticky submit. */
export function RegisterUnitLayout({
  title,
  children,
  footer,
  message,
  scroll = true,
  backgroundColor,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  message: string | null;
  /** When false, the title stays put and the body fills remaining space for an inner list. */
  scroll?: boolean;
  /** Opaque color covers the stack map background (default stays transparent). */
  backgroundColor?: string;
}) {
  return (
    <Screen footer={footer} scroll={scroll} backgroundColor={backgroundColor}>
      <View style={styles.hero}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {scroll ? children : <View style={styles.body}>{children}</View>}
      {message ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  body: { flex: 1, minHeight: 0 },
  error: { color: colors.danger, fontSize: 16 },
});
