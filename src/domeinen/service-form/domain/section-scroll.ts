/**
 * Child indices of section headers in the form scroll view.
 * Children before the sections occupy `leadingChildCount` slots. Each section then
 * contributes a header and, when it is open, a body directly after that header.
 */
export function serviceFormStickyHeaderIndices(
  expanded: readonly boolean[],
  leadingChildCount: number,
): number[] {
  const indices: number[] = [];
  let index = leadingChildCount;
  for (const isExpanded of expanded) {
    indices.push(index);
    index += isExpanded ? 2 : 1;
  }
  return indices;
}

/** Scroll offset that places a field just under a sticky section header. */
export function scrollOffsetBelowSectionHeader(fieldY: number, headerHeight: number): number {
  return Math.max(0, fieldY - headerHeight);
}
