/** Display-ready address lines from the fields shared by incident and service records. */
export type AddressSource = {
  readonly dn_concatlocation?: unknown;
  readonly dn_street?: unknown;
  readonly dn_housenumber?: unknown;
  readonly dn_housenumberadditions?: unknown;
  readonly dn_postalcodeid?: unknown;
  readonly dn_city?: unknown;
  readonly dn_country?: unknown;
};

export type ParsedAddress = {
  streetLine?: string;
  localityLine?: string;
  country?: string;
};

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const join = (parts: readonly (string | undefined)[], separator: string): string | undefined => {
  const present = parts.filter((part): part is string => part !== undefined);
  return present.length > 0 ? present.join(separator) : undefined;
};

/**
 * Prefers CRM's already-concatenated location. Structured fields are the safe fallback when a
 * list row does not have that value yet.
 */
export function addressLines(source: AddressSource): string[] {
  const structuredStreet = join(
    [text(source.dn_street), text(source.dn_housenumber), text(source.dn_housenumberadditions)],
    ' ',
  );
  const structuredLocality = join([text(source.dn_postalcodeid), text(source.dn_city)], ', ');
  const parsed = parseConcatenatedAddress(text(source.dn_concatlocation));
  const fallback = text(source.dn_concatlocation)?.replace(/\r?\n/g, ', ');
  return [
    structuredStreet ?? parsed?.streetLine ?? fallback,
    structuredLocality ?? parsed?.localityLine,
  ].filter((line): line is string => line !== undefined);
}

/** Parses the concatenated address shape used by PLTR locations into visual address lines. */
export function parseConcatenatedAddress(value: string | undefined): ParsedAddress | undefined {
  const normalized = text(value)?.replace(/\r?\n/g, ',').replace(/\s+,/g, ',');
  if (!normalized) {
    return undefined;
  }
  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  const street = splitStreet(parts[0]);
  const citySegments = parts[2]?.split(/\s+/).filter((segment) => segment !== '') ?? [];
  const country = citySegments.slice(1).join(' ');
  return {
    streetLine: join([street.street, street.houseNumber, street.addition], ' '),
    localityLine: join([parts[1], citySegments[0]], ', '),
    country: country === '' ? undefined : country,
  };
}

function splitStreet(streetWithNumber: string | undefined): {
  street?: string;
  houseNumber?: string;
  addition?: string;
} {
  if (!streetWithNumber) {
    return {};
  }
  const match = /^(.+?)\s+(\d+.*)$/.exec(streetWithNumber);
  if (!match) {
    return { street: streetWithNumber };
  }
  const numberParts = (match[2] ?? '').trim().split(/\s+/);
  const addition = numberParts.slice(1).join(' ');
  return {
    street: match[1]?.trim(),
    houseNumber: numberParts[0],
    addition: addition === '' ? undefined : addition,
  };
}
