import { answersAfterParentChange } from './answer-updates';
import type { ServiceFormAnswers, ServiceFormField, ServiceFormSection } from './types';
import { cloneServiceFormAnswer, cloneServiceFormAnswers } from './values';

function answerJson(answer: ServiceFormAnswers[string] | undefined): string {
  return JSON.stringify(answer ?? null);
}

/** True when any field in the section differs from the CRM baseline. */
export function isSectionDirty(
  section: ServiceFormSection,
  initialAnswers: ServiceFormAnswers,
  answers: ServiceFormAnswers,
): boolean {
  const keys = new Set(section.fields.map((field) => field.key));
  for (const key of keys) {
    if (answerJson(initialAnswers[key]) !== answerJson(answers[key])) {
      return true;
    }
  }
  return false;
}

/** Visible (or otherwise supplied) sections that the berger has changed, in form order. */
export function selectDirtyResetSections(
  sections: readonly ServiceFormSection[],
  initialAnswers: ServiceFormAnswers,
  answers: ServiceFormAnswers,
): ServiceFormSection[] {
  return sections.filter((section) => isSectionDirty(section, initialAnswers, answers));
}

export type SectionResetResult = {
  /** Full answer map after restoring the section (and clearing out-of-section dependents). */
  answers: ServiceFormAnswers;
  /** Keys whose transient UI flags (touched, errors, signature skips) should be cleared. */
  fieldKeys: readonly string[];
};

/**
 * Restores every field in `section` to `initialAnswers` (or drops it when the baseline has no
 * entry). When a restored parent value changes, dependents outside the section are emptied the
 * same way as a normal parent change.
 */
export function buildSectionReset(
  section: ServiceFormSection,
  allFields: readonly ServiceFormField[],
  initialAnswers: ServiceFormAnswers,
  answers: ServiceFormAnswers,
  pleaseSelectLabel: string,
): SectionResetResult {
  const next = cloneServiceFormAnswers(answers);
  const sectionKeys = new Set(section.fields.map((field) => field.key));
  const affected = new Set<string>();

  for (const field of section.fields) {
    const previous = answers[field.key];
    const baseline = initialAnswers[field.key];
    affected.add(field.key);

    if (baseline) {
      next[field.key] = cloneServiceFormAnswer(baseline);
    } else {
      delete next[field.key];
    }

    const restored = next[field.key] ?? { value: '', displayValue: '' };
    if (previous?.value === restored.value) {
      continue;
    }

    const dependentUpdates = answersAfterParentChange(
      allFields,
      answers,
      field.key,
      restored,
      pleaseSelectLabel,
    );
    for (const [key, answer] of Object.entries(dependentUpdates)) {
      if (key === field.key || sectionKeys.has(key)) {
        continue;
      }
      // Only clear dependents that already have an answer; do not invent empty slots.
      if (answers[key] === undefined && next[key] === undefined) {
        continue;
      }
      next[key] = answer;
      affected.add(key);
    }
  }

  return {
    answers: next,
    fieldKeys: [...affected],
  };
}
