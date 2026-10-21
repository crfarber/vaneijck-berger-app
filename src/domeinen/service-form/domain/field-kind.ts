import type { ServiceFormField } from './types';
import { isBooleanSelectField } from './values';

/** Which input a field gets on screen. `unsupported` renders a diagnostic instead of breaking. */
export const FIELD_KIND = {
  text: 'text',
  textarea: 'textarea',
  number: 'number',
  decimal: 'decimal',
  phone: 'phone',
  date: 'date',
  select: 'select',
  booleanSelect: 'boolean-select',
  address: 'address',
  signature: 'signature',
  unsupported: 'unsupported',
} as const;

export type FieldKind = (typeof FIELD_KIND)[keyof typeof FIELD_KIND];

const KIND_BY_TYPE: Readonly<Record<string, FieldKind>> = {
  string: FIELD_KIND.text,
  textarea: FIELD_KIND.textarea,
  number: FIELD_KIND.number,
  decimal: FIELD_KIND.decimal,
  phone: FIELD_KIND.phone,
  phonenumber: FIELD_KIND.phone,
  date: FIELD_KIND.date,
  select: FIELD_KIND.select,
  address: FIELD_KIND.address,
  signature: FIELD_KIND.signature,
};

/**
 * Plain-text label for accessibility (and tests). The on-screen mark is a red
 * asterisk rendered by `FieldFrame` / `TextField`.
 */
export function formatServiceFormFieldLabel(label: string, optional: boolean): string {
  return optional ? label : `${label} *`;
}

export function resolveFieldKind(field: ServiceFormField): FieldKind {
  if (isBooleanSelectField(field)) {
    return FIELD_KIND.booleanSelect;
  }
  return KIND_BY_TYPE[field.type.toLowerCase()] ?? FIELD_KIND.unsupported;
}

/**
 * What the user typed, as it is stored. Decimals take a dot, like the CRM values the form is
 * pre-filled with (`formatDecimal`); the Dutch keypad types a comma
 * (docs/functioneel/open-vragen.md, vraag 28).
 */
export function normalizeFieldInput(kind: FieldKind, text: string): string {
  return kind === FIELD_KIND.decimal ? text.replace(/,/g, '.') : text;
}

export type FieldGroup =
  { kind: 'readonly'; fields: ServiceFormField[] } | { kind: 'field'; field: ServiceFormField };

/** Consecutive read-only fields collapse into one summary block, like the pilot's form.
 * Pass `{ readonly: true }` to show the whole section as one summary (service preview). */
export function groupSectionFields(
  fields: readonly ServiceFormField[],
  options?: { readonly?: boolean },
): FieldGroup[] {
  if (options?.readonly) {
    return fields.length > 0 ? [{ kind: 'readonly', fields: [...fields] }] : [];
  }
  const groups: FieldGroup[] = [];
  for (const field of fields) {
    const previous = groups[groups.length - 1];
    if (field.readOnly && previous?.kind === 'readonly') {
      previous.fields.push(field);
    } else if (field.readOnly) {
      groups.push({ kind: 'readonly', fields: [field] });
    } else {
      groups.push({ kind: 'field', field });
    }
  }
  return groups;
}
