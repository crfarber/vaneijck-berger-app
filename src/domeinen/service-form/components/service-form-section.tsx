import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { colors, radius, spacing } from '@/shared/ui/theme';
import { ProgressCircle } from './progress-circle';

/** Circle plus header padding, used until the header reports its real height. */
export const serviceFormSectionHeaderFallbackHeight = 36 + spacing.md * 2;

/**
 * The section header is its own scroll child so the form can pin it with
 * `stickyHeaderIndices` until the next section header takes its place.
 */
export function ServiceFormSectionHeader({
  title,
  expanded,
  completed,
  total,
  errorCount,
  onToggle,
  onLayout,
}: {
  title: string;
  expanded: boolean;
  completed: number;
  total: number;
  errorCount: number;
  onToggle: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View onLayout={onLayout} style={[styles.occluder, !expanded && styles.occluderCollapsed]}>
      <View style={[styles.header, expanded ? styles.headerExpanded : styles.headerCollapsed]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggle}
          hitSlop={spacing.md}
          style={({ pressed }) => [styles.headerRow, pressed && styles.pressed]}
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
      </View>
    </View>
  );
}

/** Field block under a section header. It moves under the pinned header, which covers it. */
export function ServiceFormSectionBody({ children }: { children: ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

const styles = StyleSheet.create({
  // Square plate. The sticky header scrolls fields underneath this view; a rounded
  // background would leave those fields visible in the corners.
  occluder: {
    backgroundColor: colors.background,
    zIndex: 2,
    elevation: 4,
  },
  occluderCollapsed: {
    marginBottom: spacing.md,
  },
  header: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerExpanded: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  headerCollapsed: {
    borderRadius: radius.md,
  },
  headerRow: {
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
  body: {
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    zIndex: 0,
    elevation: 0,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
});
