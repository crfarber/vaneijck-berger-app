/** Helpers for CRM option-set (picklist) values, which arrive as numbers or numeric strings. */

export function hasFilledOptionCode(value: unknown): boolean {
  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  return false;
}

export function toOptionCode(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const code = Number(value);
    return Number.isNaN(code) ? null : code;
  }
  return null;
}
