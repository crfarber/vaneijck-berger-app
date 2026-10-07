import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from './theme';

/** Full-width row of `ToolbarButton`s; each `ToolbarSlot` gets an equal share of the width. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

/** One equal share of the row; N slots → each gets 1/N of the width via flex. */
export function ToolbarSlot({ children }: { children: ReactNode }) {
  return <View style={styles.slot}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  slot: {
    flex: 1,
    minWidth: 0,
  },
});
