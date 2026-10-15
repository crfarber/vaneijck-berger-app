import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import CheckIcon from '@/shared/ui/icons/check';
import { ChevronIcon } from '@/shared/ui/icons/chevron';
import { colors, radius, spacing, type } from '@/shared/ui/theme';

/** Count container plus header padding, used until the header reports its real height. */
export const serviceFormSectionHeaderFallbackHeight = 28 + spacing.sm * 2 + spacing.sm * 2;

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
  const complete = total === 0 || completed >= total;

  return (
    <View onLayout={onLayout} style={[styles.occluder, !expanded && styles.occluderCollapsed]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        hitSlop={spacing.sm}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <BlurView
          pointerEvents="none"
          intensity={15}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.countContainer}>
            {complete ? (
              <CheckIcon size={18} color={colors.success} solid />
            ) : (
              <Text style={styles.count}>
                {completed}/{total}
              </Text>
            )}
          </View>
          <Text style={styles.title}>{title}</Text>
          {errorCount > 0 ? (
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>{errorCount}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.countContainer}>
          <ChevronIcon direction={expanded ? 'up' : 'down'} size={18} color={colors.brandLight} />
        </View>
      </Pressable>
    </View>
  );
}

/** Field block under a section header. It moves under the pinned header, which covers it. */
export function ServiceFormSectionBody({ children }: { children: ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

const styles = StyleSheet.create({
  occluder: {
    paddingHorizontal: spacing.md,
  },
  occluderCollapsed: {
    marginBottom: spacing.md,
  },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.brandDarker,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.025)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  countContainer: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 28,
    minHeight: 28,
  },
  count: {
    ...type.label,
    color: colors.brandLight,
  },
  pressed: { opacity: 0.6 },
  title: {
    ...type.label,
    color: colors.brandLight,
    flexShrink: 1,
  },
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
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
    zIndex: 0,
    elevation: 0,
  },
});
