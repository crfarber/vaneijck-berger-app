/**
 * Dutch license plates ("sidecodes" 1 to 14): six characters, in three groups of letters (L)
 * and digits (D). The 14 layouts below are the ones the RDW issues.
 */
type Kind = 'L' | 'D';
type Layout = readonly [readonly [Kind, number], readonly [Kind, number], readonly [Kind, number]];

const LAYOUTS: readonly Layout[] = [
  [
    ['L', 2],
    ['D', 2],
    ['D', 2],
  ], // 1  XX-99-99
  [
    ['D', 2],
    ['D', 2],
    ['L', 2],
  ], // 2  99-99-XX
  [
    ['D', 2],
    ['L', 2],
    ['D', 2],
  ], // 3  99-XX-99
  [
    ['L', 2],
    ['D', 2],
    ['L', 2],
  ], // 4  XX-99-XX
  [
    ['L', 2],
    ['L', 2],
    ['D', 2],
  ], // 5  XX-XX-99
  [
    ['D', 2],
    ['L', 2],
    ['L', 2],
  ], // 6  99-XX-XX
  [
    ['D', 2],
    ['L', 3],
    ['D', 1],
  ], // 7  99-XXX-9
  [
    ['D', 1],
    ['L', 3],
    ['D', 2],
  ], // 8  9-XXX-99
  [
    ['L', 2],
    ['D', 3],
    ['L', 1],
  ], // 9  XX-999-X
  [
    ['L', 1],
    ['D', 3],
    ['L', 2],
  ], // 10 X-999-XX
  [
    ['L', 3],
    ['D', 2],
    ['L', 1],
  ], // 11 XXX-99-X
  [
    ['L', 1],
    ['D', 2],
    ['L', 3],
  ], // 12 X-99-XXX
  [
    ['D', 1],
    ['L', 2],
    ['D', 3],
  ], // 13 9-XX-999
  [
    ['D', 3],
    ['L', 2],
    ['D', 1],
  ], // 14 999-XX-9
];

const PLATE_LENGTH = 6;
const DEFAULT_SPLITS: readonly [number, number] = [2, 4];

const KIND_PATTERN: Record<Kind, RegExp> = { L: /^[A-Z]+$/, D: /^[0-9]+$/ };

/** Upper case, without hyphens, spaces or any other character. */
export function normalizeLicensePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Whether the characters typed so far can still become this layout. */
function fitsAsPrefix(raw: string, layout: Layout): boolean {
  let position = 0;
  for (const [kind, length] of layout) {
    const chunk = raw.slice(position, position + length);
    if (chunk.length === 0) {
      return true;
    }
    if (!KIND_PATTERN[kind].test(chunk)) {
      return false;
    }
    position += length;
    if (position >= raw.length) {
      return true;
    }
  }
  return true;
}

function fitsFully(raw: string, layout: Layout): boolean {
  return raw.length === PLATE_LENGTH && fitsAsPrefix(raw, layout);
}

function splitsOf(layout: Layout): readonly [number, number] {
  return [layout[0][1], layout[0][1] + layout[1][1]];
}

function insertHyphens(raw: string): string {
  const candidate =
    raw.length <= PLATE_LENGTH ? LAYOUTS.find((layout) => fitsAsPrefix(raw, layout)) : undefined;
  const [first, second] = candidate ? splitsOf(candidate) : DEFAULT_SPLITS;

  if (raw.length <= first) {
    return raw;
  }
  if (raw.length <= second) {
    return `${raw.slice(0, first)}-${raw.slice(first)}`;
  }
  return `${raw.slice(0, first)}-${raw.slice(first, second)}-${raw.slice(second)}`;
}

/** Puts the hyphens of the layout that fits the input best. Input without characters is returned as is. */
export function formatLicensePlate(value: string): string {
  const raw = normalizeLicensePlate(value);
  return raw ? insertHyphens(raw) : value;
}

/** True for exactly six characters that match one of the 14 layouts. */
export function isDutchLicensePlate(value: string): boolean {
  const raw = normalizeLicensePlate(value).slice(0, PLATE_LENGTH);
  return LAYOUTS.some((layout) => fitsFully(raw, layout));
}

/**
 * True when empty or the characters so far can still become one of the 14 NL layouts
 * (while typing a Dutch plate). False for military / foreign patterns that cannot.
 */
export function canBeDutchLicensePlate(value: string): boolean {
  const raw = normalizeLicensePlate(value);
  if (raw.length === 0) {
    return true;
  }
  if (raw.length > PLATE_LENGTH) {
    return false;
  }
  return LAYOUTS.some((layout) => fitsAsPrefix(raw, layout));
}

export type LicensePlateInput = {
  /** What to show in the field, with hyphens. */
  formatted: string;
  /** The characters without hyphens, at most six. */
  raw: string;
  /** Null while the plate is not complete yet. */
  isValid: boolean | null;
};

/** Everything a plate input field needs for one change of its text. */
export function applyLicensePlateInput(text: string): LicensePlateInput {
  const raw = normalizeLicensePlate(text).slice(0, PLATE_LENGTH);
  return {
    raw,
    formatted: insertHyphens(raw),
    isValid: raw.length === PLATE_LENGTH ? isDutchLicensePlate(raw) : null,
  };
}

export type VehicleRegistrationDisplay = {
  text: string;
  variant: 'dutch' | 'foreign';
};

/** Formats a plate for display; applies NL sidecode rules only to valid Dutch plates. */
export function displayVehicleRegistration(value: string): VehicleRegistrationDisplay {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { text: '', variant: 'foreign' };
  }

  const raw = normalizeLicensePlate(trimmed);
  if (isDutchLicensePlate(raw)) {
    return { text: formatLicensePlate(trimmed), variant: 'dutch' };
  }

  return { text: trimmed.toUpperCase(), variant: 'foreign' };
}
