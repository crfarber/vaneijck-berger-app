/**
 * Editable service-form sections behave as an accordion: at most one section is expanded.
 * The finish/overview screen still opens many sections via initialize([...ids]).
 */

/** Toggle: close if already open, otherwise open alone (closing every other section). */
export function toggleAccordionSection(
  expandedSections: Readonly<Record<string, true>>,
  sectionId: string,
): Record<string, true> {
  if (expandedSections[sectionId]) {
    return {};
  }
  return { [sectionId]: true };
}

/** Open one section and close all others (e.g. jump to validation error). */
export function expandAccordionSection(sectionId: string): Record<string, true> {
  return { [sectionId]: true };
}
