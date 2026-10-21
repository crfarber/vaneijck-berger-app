import type { NormalizedServiceForm, ServiceFormField } from './types';

/**
 * Select fields whose options should load as soon as the form is ready — before they become
 * visible. Includes distance-sorted lists (depots) and quick-pick chips. Skips fields that need a
 * dependency answer first (e.g. vehicle type after brand).
 */
export function selectPrefetchableSelectFields(
  form: NormalizedServiceForm,
): readonly ServiceFormField[] {
  return form.sections.flatMap((section) =>
    section.fields.filter((field) => isPrefetchableSelectField(field)),
  );
}

export function isPrefetchableSelectField(field: ServiceFormField): boolean {
  if (!field.table) {
    return false;
  }
  if (field.dependencies?.required) {
    return false;
  }
  const hasQuickPicks = field.quickPicks !== undefined && field.quickPicks > 0;
  const sortsByDistance = field.sortOptions?.orderby === 'distance';
  return hasQuickPicks || sortsByDistance;
}
