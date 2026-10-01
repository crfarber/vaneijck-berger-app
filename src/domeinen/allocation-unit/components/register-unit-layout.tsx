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
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  message: string | null;
}) {
  return (
    <Screen footer={footer} backgroundColor={colors.background}>
      <View style={styles.hero}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
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
  error: { color: colors.danger, fontSize: 16 },
});
