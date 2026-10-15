import type { Coordinate } from '@/domeinen/location';
import type { ServiceFormAnswer, ServiceFormSortOptions } from './types';

/**
 * Turning a synced reference table (`field.table`) into the options of a select field. Ported from
 * the pilot's `utils/selectOptions.ts`, which extracted it from `ProcessingService.SelectButton`.
 * Two things differ on purpose: options carry their own value (the pilot looked the row up again
 * by label, so two rows with the same label always stored the first one's value), and nothing
 * here mutates the rows it is given (the pilot's distance sort wrote a `distance` onto each row).
 */

export type OptionRow = { readonly [key: string]: unknown };

export type SelectOption = { label: string; value: unknown };

/** Where a CRM lookup or option set keeps the value that is submitted, most specific first. */
const OPTION_VALUE_KEYS = [
  'Value',
  'dn_countryid',
  'dn_locationid',
  'dn_vehicletypeid',
  'dn_vehiclebrandid',
  'accountid',
] as const;

const VEHICLE_TYPE_TABLE = 'dn_vehicletypes';
const COUNTRY_TABLE = 'dn_country';

/**
 * The old app compared exact labels ('Nederland', 'Belgium', 'Germany'). The synced table is
 * always Dutch (docs/functioneel/open-vragen.md, vragen 6 en 29), so the Dutch names count too.
 */
const COUNTRY_PRIORITY: readonly (readonly string[])[] = [
  ['Nederland', 'Netherlands'],
  ['België', 'Belgium'],
  ['Duitsland', 'Germany'],
];

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const coordinate = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isEmptyValue = (value: unknown): boolean =>
  value === null || value === undefined || value === '';

/** Display label of a row: `Text` (option sets), else `dn_name`, else `name` (accounts). */
export function optionLabel(row: OptionRow): string | undefined {
  return text(row.Text) ?? text(row.dn_name) ?? text(row.name);
}

/** The CRM value submitted for a row; `0` is a real option-set value. */
export function optionValue(row: OptionRow): unknown {
  for (const key of OPTION_VALUE_KEYS) {
    if (!isEmptyValue(row[key])) {
      return row[key];
    }
  }
  const fallback = Object.entries(row).find(
    ([key, value]) => /id$/i.test(key) && (typeof value === 'string' || typeof value === 'number'),
  );
  return fallback?.[1];
}

/** Vehicle types of the chosen brand only; without a brand there is nothing to choose from. */
export function filterVehicleTypesByBrand(
  rows: readonly OptionRow[],
  brandId: unknown,
): OptionRow[] {
  if (isEmptyValue(brandId)) {
    return [];
  }
  return rows.filter((row) => row._dn_vehiclebrandid_value === brandId);
}

/**
 * Nearest first (or furthest, when descending), by squared planar distance like the old app; rows
 * without coordinates go last either way.
 */
export function sortOptionsByDistance(
  rows: readonly OptionRow[],
  position: Coordinate,
  direction: string | undefined,
): OptionRow[] {
  const measured = rows.map((row) => {
    const latitude = coordinate(row.dn_latitude ?? row.latitude);
    const longitude = coordinate(row.dn_longitude ?? row.longitude);
    const distance =
      latitude !== undefined && longitude !== undefined
        ? (latitude - position.latitude) ** 2 + (longitude - position.longitude) ** 2
        : undefined;
    return { row, distance };
  });
  measured.sort((a, b) => {
    if (a.distance === undefined) {
      return b.distance === undefined ? 0 : 1;
    }
    if (b.distance === undefined) {
      return -1;
    }
    return direction === 'descending' ? b.distance - a.distance : a.distance - b.distance;
  });
  return measured.map(({ row }) => row);
}

/** The Netherlands, Belgium and Germany first, then the rest alphabetically. */
export function sortCountryOptions(options: readonly SelectOption[]): SelectOption[] {
  const rank = (label: string): number => {
    const index = COUNTRY_PRIORITY.findIndex((names) => names.includes(label));
    return index === -1 ? COUNTRY_PRIORITY.length : index;
  };
  return [...options].sort((a, b) => {
    const byRank = rank(a.label) - rank(b.label);
    if (byRank !== 0) {
      return byRank;
    }
    return a.label > b.label ? 1 : b.label > a.label ? -1 : 0;
  });
}

export type SelectOptionsInput = {
  table?: string;
  sortOptions?: ServiceFormSortOptions;
  /** The answer of `field.dependencies.required` (the brand, for vehicle types). */
  dependencyValue?: unknown;
  /** Null when the device has no position; distance sorting then keeps the table order. */
  currentPosition?: Coordinate | null;
};

export type SelectOptionsResult =
  | { kind: 'options'; options: SelectOption[] }
  /** Vehicle type without a brand: the old app asked to pick the brand first. */
  | { kind: 'needs-dependency' }
  | { kind: 'empty' };

export function buildSelectOptions(
  rows: readonly OptionRow[],
  input: SelectOptionsInput,
): SelectOptionsResult {
  if (input.table === VEHICLE_TYPE_TABLE && isEmptyValue(input.dependencyValue)) {
    return { kind: 'needs-dependency' };
  }

  let ordered: readonly OptionRow[] =
    input.table === VEHICLE_TYPE_TABLE
      ? filterVehicleTypesByBrand(rows, input.dependencyValue)
      : rows;
  if (input.sortOptions?.orderby === 'distance' && input.currentPosition) {
    ordered = sortOptionsByDistance(ordered, input.currentPosition, input.sortOptions.direction);
  }

  let options = ordered.flatMap((row): SelectOption[] => {
    const label = optionLabel(row);
    const value = optionValue(row);
    return label !== undefined && value !== undefined ? [{ label, value }] : [];
  });
  if (input.table === COUNTRY_TABLE) {
    options = sortCountryOptions(options);
  }

  return options.length > 0 ? { kind: 'options', options } : { kind: 'empty' };
}

/**
 * The search box of a select with `autocomplete: true`: case-insensitive, and only from the second
 * character on, exactly like the old modal.
 */
export function filterSelectOptions(
  options: readonly SelectOption[],
  query: string,
): readonly SelectOption[] {
  const needle = query.trim().toUpperCase();
  if (needle.length < 2) {
    return options;
  }
  return options.filter((option) => option.label.toUpperCase().includes(needle));
}

/**
 * First `count` options for quick-pick chips. The currently selected option is always included,
 * appended when it falls outside the first N (options are already sorted by the caller).
 */
export function pickQuickOptions(
  options: readonly SelectOption[],
  count: number,
  selectedValue: unknown,
): SelectOption[] {
  if (count <= 0 || options.length === 0) {
    return [];
  }
  const head = options.slice(0, count);
  if (selectedValue === null || selectedValue === undefined || selectedValue === '') {
    return [...head];
  }
  if (head.some((option) => option.value === selectedValue)) {
    return [...head];
  }
  const selected = options.find((option) => option.value === selectedValue);
  return selected ? [...head, selected] : [...head];
}

export function selectedOptionAnswer(
  option: SelectOption,
  table: string | undefined,
): ServiceFormAnswer {
  return { value: option.value, displayValue: option.label, table };
}

const storedValue = (row: OptionRow): unknown => (row.Value !== undefined ? row.Value : row.value);

/** The row for a yes/no toggle: by stored boolean first, else by the localized yes/no label. */
export function findBooleanSelectRow(
  rows: readonly OptionRow[],
  next: boolean,
  labels: { yes: string; no: string },
): OptionRow | undefined {
  const byValue = rows.find((row) => storedValue(row) === next);
  if (byValue) {
    return byValue;
  }
  const label = next ? labels.yes : labels.no;
  return rows.find((row) => optionLabel(row) === label);
}

/**
 * A yes/no toggle as a CRM answer: the synced row when there is one, otherwise `true`/`false` for
 * `dn_truefalse` and `1`/`0` for the optional-yes/no tables. `null` clears an optional toggle.
 */
export function buildBooleanSelectAnswer(
  rows: readonly OptionRow[],
  next: boolean | null,
  options: { yesLabel: string; noLabel: string; table?: string },
): ServiceFormAnswer {
  if (next === null) {
    return { value: '', displayValue: '', table: options.table };
  }

  const fallbackLabel = next ? options.yesLabel : options.noLabel;
  const row = findBooleanSelectRow(rows, next, { yes: options.yesLabel, no: options.noLabel });
  if (row) {
    const value = optionValue(row);
    return {
      value: isEmptyValue(value) ? next : value,
      displayValue: optionLabel(row) ?? fallbackLabel,
      table: options.table,
    };
  }

  return {
    value: options.table === 'dn_truefalse' ? next : next ? 1 : 0,
    displayValue: fallbackLabel,
    table: options.table,
  };
}

/** The toggle position for a stored answer: yes, no, or not chosen. */
export function booleanSelectState(answer: ServiceFormAnswer | undefined): boolean | null {
  const value = answer?.value;
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0) {
    return false;
  }
  return null;
}
