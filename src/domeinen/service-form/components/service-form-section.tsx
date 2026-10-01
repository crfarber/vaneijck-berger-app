import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { ProgressCircle } from './progress-circle';

/** One tab of the schema as a collapsible block, with its own progress and error count. */
export function ServiceFormSection({
  title,
  expanded,
  completed,
  total,
  errorCount,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  completed: number;
  total: number;
  errorCount: number;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <ProgressCircle completed={completed} total={total} />
        <Text style={styles.title}>{title}</Text>
        {errorCount > 0 ? (
          <View style={styles.errorBadge}>
            <Text style={styles.errorBadgeText}>{errorCount}</Text>
          </View>
        ) : null}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  pressed: { opacity: 0.6 },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  errorBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBadgeText: { color: colors.background, fontSize: 13, fontWeight: '700' },
  body: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
});
